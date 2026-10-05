import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getKaryawan, getAbsensi, getGaji, getPengaturan, rupiah } from '../api'
import { useAdmin } from '../hooks/useAdmin'
import PinLock from '../components/PinLock'

const COLORS = ['#3b82f6','#22c55e','#f59e0b','#a78bfa','#ef4444','#14b8a6']

const inisial = n =>
  n.split(' ')
   .slice(0,2)
   .map(w => w[0])
   .join('')

const toLocalDateStr = (d = new Date()) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const makeSafeDate = (year, monthIndex, day) => {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  return new Date(year, monthIndex, Math.min(day, lastDay))
}

const getPayrollPeriod = (today, cutoffDay) => {
  const y = today.getFullYear()
  const m = today.getMonth()
  const d = today.getDate()

  let start
  let end

  if (d <= cutoffDay) {
    const prevCutoff = makeSafeDate(y, m - 1, cutoffDay)
    start = new Date(
      prevCutoff.getFullYear(),
      prevCutoff.getMonth(),
      prevCutoff.getDate() + 1
    )
    end = makeSafeDate(y, m, cutoffDay)
  } else {
    const currentCutoff = makeSafeDate(y, m, cutoffDay)
    start = new Date(
      currentCutoff.getFullYear(),
      currentCutoff.getMonth(),
      currentCutoff.getDate() + 1
    )
    end = makeSafeDate(y, m + 1, cutoffDay)
  }

  return {
    dari: toLocalDateStr(start),
    sampai: toLocalDateStr(end),
    start,
    end
  }
}

const getPayDate = (periodEnd, cutoffDay, payDay) => {
  const nextMonth = payDay <= cutoffDay ? 1 : 0
  return makeSafeDate(
    periodEnd.getFullYear(),
    periodEnd.getMonth() + nextMonth,
    payDay
  )
}

const fmtShortDate = d =>
  d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short'
  })

export default function Dashboard() {
  const navigate = useNavigate()
  const [karyawan, setKaryawan] = useState([])
  const [absenMap, setAbsenMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [totalPayroll, setTotalPayroll] = useState(0)
  const [payrollPeriod, setPayrollPeriod] = useState(null)
  const [payDate, setPayDate] = useState(null)

  const { isAdmin } = useAdmin()
  const [showPin, setShowPin] = useState(!isAdmin)

  useEffect(() => {
    if (!showPin) {
      loadData()
    }
  }, [showPin])

  async function loadData() {
    try {
      setLoading(true)
      setError(null)

      const [k, a, cfgRes] = await Promise.all([
        getKaryawan(),
        getAbsensi(toLocalDateStr()),
        getPengaturan()
      ])

      const listKaryawan = Array.isArray(k?.data) ? k.data : []
      const listAbsen    = Array.isArray(a?.data) ? a.data : []
      const cfgData      = Array.isArray(cfgRes?.data)
        ? (cfgRes.data[0] || {})
        : (cfgRes?.data || {})

      setKaryawan(listKaryawan)

      const map = {}
      listAbsen.forEach(x => {
        if (x.karyawan_id) map[x.karyawan_id] = x.status
      })
      setAbsenMap(map)

      const cutoffDay = parseInt(cfgData.tgl_tutup_gajian, 10) || 25
      const payDay    = parseInt(cfgData.tgl_bayar_gajian, 10) || 27

      const period = getPayrollPeriod(new Date(), cutoffDay)
      setPayrollPeriod(period)
      setPayDate(getPayDate(period.end, cutoffDay, payDay))

      const potongPerHari = parseInt(cfgData.potong_absen, 10) || 50000

      const hasilGaji = await Promise.all(
        listKaryawan.map(karyawanItem =>
          getGaji(
            karyawanItem.id,
            null,
            null,
            { dari: period.dari, sampai: period.sampai }
          )
        )
      )

      const total = hasilGaji.reduce((sum, result) => {
        const g = result?.data
        if (!g) return sum

        const rincian = g.rincian || {}
        const ringkasan = g.ringkasan_absen || {}

        const totalHariMangkir =
          (ringkasan.sakit || 0) +
          (ringkasan.izin || 0)

        const totalPotonganAbsen = totalHariMangkir * potongPerHari

        const gajiPokok      = rincian.gaji_pokok || 0
        const tunjangan      = rincian.tunjangan || 0
        const bonusPasang    = rincian.bonus_pasang || 0
        const bonusManual    = rincian.bonus_manual || 0
        const potonganSistem = g.total_potongan || 0

        const gajiBersih =
          (gajiPokok + tunjangan + bonusPasang + bonusManual) -
          potonganSistem -
          totalPotonganAbsen

        return sum + Math.max(0, gajiBersih)
      }, 0)

      setTotalPayroll(total)

    } catch (err) {
      console.error('Dashboard load error:', err)
      setError(err?.message || 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  const hadir = karyawan.filter(k => absenMap[k.id] === 'hadir').length
  const si = karyawan.filter(k => ['sakit','izin'].includes(absenMap[k.id])).length

  if (showPin) {
    return (
      <>
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
          <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>Dashboard Terkunci</div>
          <div style={{ fontSize:13, color:'var(--text3)', marginBottom:24 }}>
            Masukkan PIN admin untuk melihat data karyawan
          </div>
          <button
            onClick={() => setShowPin(true)}
            style={{ padding:'13px 32px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'var(--radius)', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}
          >
            🔑 Masukkan PIN
          </button>
        </div>
        <PinLock
          onSuccess={() => setShowPin(false)}
          onCancel={() => navigate('/absen')}
        />
      </>
    )
  }

  if (loading) {
    return <div style={{ padding:40, textAlign:'center', color:'var(--text3)' }}>Memuat...</div>
  }

  if (error) {
    return (
      <div style={{ padding:40, textAlign:'center', color:'var(--red)' }}>
        ⚠️ {error} <br/>
        <button
          onClick={loadData}
          style={{ marginTop:10, padding:'6px 12px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:6, cursor:'pointer' }}
        >
          Coba Lagi
        </button>
      </div>
    )
  }

  const payrollSub = payrollPeriod
    ? `${fmtShortDate(payrollPeriod.start)}–${fmtShortDate(payrollPeriod.end)}${payDate ? ` · bayar ${fmtShortDate(payDate)}` : ''}`
    : 'siklus berjalan'

  return (
    <div>
      <p style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.08em', padding:'14px 20px 6px' }}>
        Ringkasan hari ini
      </p>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, padding:'0 16px', marginBottom:4 }}>
        {[
          { label:'Hadir', val:hadir, color:'var(--green)', sub:`dari ${karyawan.length} karyawan` },
          { label:'Sakit / Izin', val:si, color:'var(--amber)', sub:'ada keterangan' },
          { label:'Est. payroll siklus ini', val:rupiah(totalPayroll), color:'var(--accent)', sub:payrollSub, mono:true },
          { label:'Belum absen', val:karyawan.length-hadir-si, color:'var(--text2)', sub:'hari ini' }
        ].map((s,i) => (
          <div key={i} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:13 }}>
            <div style={{ fontSize:10, color:'var(--text3)', marginBottom:5 }}>{s.label}</div>
            <div style={{ fontSize:s.mono ? 14 : 22, fontWeight:700, letterSpacing:-1, fontFamily:s.mono ? 'DM Mono,monospace' : 'inherit', color:s.color }}>
              {s.val}
            </div>
            <div style={{ fontSize:10, color:'var(--text3)', marginTop:3 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px 6px' }}>
        <p style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.08em' }}>
          Karyawan — tap untuk detail
        </p>
        <button
          onClick={() => navigate('/tambah')}
          style={{ display:'flex', alignItems:'center', gap:5, background:'var(--accent)', color:'#fff', border:'none', borderRadius:'var(--radius-sm)', padding:'6px 14px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}
        >
          + Tambah
        </button>
      </div>

      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'0 16px', margin:'0 16px 24px' }}>
        {karyawan.map((k,i) => {
          const st = absenMap[k.id]

          const badge = {
            hadir: { label:'Hadir', color:'var(--green)' },
            sakit: { label:'Sakit', color:'var(--red)' },
            izin:  { label:'Izin', color:'var(--amber)' },
            libur: { label:'Libur', color:'var(--text3)' }
          }[st] || { label:'Belum', color:'var(--text3)' }

          return (
            <div
              key={k.id}
              onClick={() => navigate(`/dashboard/${k.id}`)}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom: i < karyawan.length-1 ? '1px solid var(--border)' : 'none', cursor:'pointer' }}
            >
              <div style={{
                width:34,
                height:34,
                borderRadius:'50%',
                background:COLORS[i % COLORS.length],
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                fontSize:12,
                fontWeight:700,
                color:'#fff',
                flexShrink:0
              }}>
                {inisial(k.nama)}
              </div>

              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{k.nama}</div>
                <div style={{ fontSize:10, color:'var(--text3)' }}>
                  {k.jabatan?.nama} · {k.shift?.nama}
                </div>
              </div>

              <div style={{ fontSize:12, fontWeight:700, color:'var(--accent)', fontFamily:'DM Mono,monospace', marginRight:8 }}>
                {rupiah((k.jabatan?.gaji_pokok || 0) + (k.jabatan?.tunjangan || 0))}
              </div>

              <div style={{
                fontSize:10,
                fontWeight:600,
                padding:'3px 8px',
                borderRadius:20,
                background:badge.color + '22',
                color:badge.color,
                flexShrink:0
              }}>
                {badge.label}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
