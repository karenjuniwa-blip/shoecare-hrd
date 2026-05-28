import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getKaryawan, getAbsensi, rupiah } from '../api'
import { useAdmin } from '../hooks/useAdmin'
import { unduhExcelHRD, unduhPdfHRD } from '../utils/ekspor'
import PinLock from '../components/PinLock'

// ── PERBAIKAN 1: Mengembalikan Array COLORS (Termudah, No Internet) ──
const COLORS = ['#3b82f6','#22c55e','#f59e0b','#a78bfa','#ef4444','#14b8a6']

// ── PERBAIKAN 2: Mengembalikan Fungsi Inisial ──
const inisial = n =>
  n.split(' ')
   .slice(0,2)
   .map(w => w[0])
   .join('')

const todayStr = () =>
  new Date().toISOString().split('T')[0]

export default function Dashboard() {
  const navigate = useNavigate()
  const [karyawan, setKaryawan] = useState([])
  const [absenMap, setAbsenMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null) // Keamanan: Tetap ada try/catch agar stabil

  const { isAdmin } = useAdmin()
  const [showPin, setShowPin] = useState(!isAdmin)

  // Keamanan: Tetap ambil data HANYA jika PIN sudah aman
  useEffect(() => {
    if (!showPin) {
      loadData()
    }
  }, [showPin]) 

  async function loadData() {
    try {
      setLoading(true)
      setError(null)

      const [k, a] = await Promise.all([
        getKaryawan(),
        getAbsensi(todayStr())
      ])

      // Validasi Array agar tidak blank putih
      const listKaryawan = Array.isArray(k?.data) ? k.data : []
      const listAbsen    = Array.isArray(a?.data) ? a.data : []

      setKaryawan(listKaryawan)

      const map = {}
      listAbsen.forEach(x => {
        if (x.karyawan_id) map[x.karyawan_id] = x.status
      })

      setAbsenMap(map)
    } catch (err) {
      console.error("Dashboard load error:", err)
      setError(err?.message || "Gagal memuat data")
    } finally {
      setLoading(false)
    }
  }

  const hadir = karyawan.filter(k => absenMap[k.id] === 'hadir').length
  const si = karyawan.filter(k => ['sakit','izin'].includes(absenMap[k.id])).length

  const totalGaji = karyawan.reduce((s,k) =>
    s + (k.jabatan?.gaji_pokok || 0) + (k.jabatan?.tunjangan || 0)
  , 0)

  // Fungsi pembantu untuk memproses cetak data bulanan secara aman
  const tanganiEkspor = (jenis) => {
    const namaBulan = new Date().toLocaleString('id-ID', { month: 'long' })
    const tahunIni = new Date().getFullYear().toString()
    
    // Pemetaan data mentah dashboard agar sesuai struktur kolom laporan ekspor
    const dataFormatted = karyawan.map(k => ({
      nama: k.nama,
      jabatan: k.jabatan,
      total_hadir: absenMap[k.id] === 'hadir' ? 1 : 0,
      total_izin_sakit: ['sakit','izin'].includes(absenMap[k.id]) ? 1 : 0,
      gaji_pokok: k.jabatan?.gaji_pokok || 0,
      tunjangan: k.jabatan?.tunjangan || 0,
      bonus_pasang: 0, // Parameter fallback harian awal
      gaji_bersih: (k.jabatan?.gaji_pokok || 0) + (k.jabatan?.tunjangan || 0)
    }))

    if (jenis === 'excel') {
      unduhExcelHRD(dataFormatted, namaBulan, tahunIni)
    } else {
      unduhPdfHRD(dataFormatted, namaBulan, tahunIni)
    }
  }

  // Tampilan PIN Lock (Keamanan: Tetap terjaga)
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
        <button onClick={loadData} style={{ marginTop:10, padding:'6px 12px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:6, cursor:'pointer' }}>Coba Lagi</button>
      </div>
    )
  }

  return (
    <div>
      {/* Stat cards */}
      <p style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.08em', padding:'14px 20px 6px' }}>
        Ringkasan hari ini
      </p>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, padding:'0 16px', marginBottom:4 }}>
        {[
          { label:'Hadir', val:hadir, color:'var(--green)', sub:`dari ${karyawan.length} karyawan` },
          { label:'Sakit / Izin', val:si, color:'var(--amber)', sub:'ada keterangan' },
          { label:'Est. gaji bulan ini', val:rupiah(totalGaji), color:'var(--accent)', sub:'semua karyawan', mono:true },
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

      {/* ── TOMBOL EKSPOR LAPORAN REKAPITULASI (BARU) ── */}
      <div style={{ display:'flex', gap:10, padding:'12px 16px 4px' }}>
        <button
          onClick={() => tanganiEkspor('excel')}
          style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px', background:'#22c55e', color:'#fff', border:'none', borderRadius:'var(--radius-sm)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}
        >
          📊 Unduh Excel
        </button>
        <button
          onClick={() => tanganiEkspor('pdf')}
          style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px', background:'#ef4444', color:'#fff', border:'none', borderRadius:'var(--radius-sm)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}
        >
          📄 Unduh PDF
        </button>
      </div>

      {/* Daftar karyawan */}
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
          const badgeColor = { hadir:'var(--green)', sakit:'var(--red)', izin:'var(--amber)' }[st] || 'var(--text3)'

          return (
            <div
              key={k.id}
              onClick={() => navigate(`/dashboard/${k.id}`)}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom: i < karyawan.length-1 ? '1px solid var(--border)' : 'none', cursor:'pointer' }}
            >
              
              {/* ── PERBAIKAN 3: KEMBALI KE BENTUK PALING SEDERHANA (Inisial Berwarna) ── */}
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

              <div style={{ fontSize:10, fontWeight:600, padding:'3px 8px', borderRadius:20, background:badgeColor + '22', color:badgeColor, flexShrink:0 }}>
                {st || 'Belum'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}