import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getKaryawan, getAbsensi, getGaji, getPengaturan, getPasang, rupiah } from '../api'
import { localISO, payrollPeriod, paymentDate } from '../utils/payrollPeriod'

const shortDate = date => date.toLocaleDateString('id-ID',{day:'numeric',month:'short'})

export default function Dashboard() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadData() {
    setLoading(true); setError('')
    try {
      const today = localISO()
      const [peopleRes, absenRes, cfgRes, pasangRes] = await Promise.all([
        getKaryawan(), getAbsensi(today), getPengaturan(), getPasang(today)
      ])
      const people = peopleRes.data || []
      const absen = absenRes.data || []
      const produksi = pasangRes.data || []
      const cfg = cfgRes.data || {}
      const cutoff = Number(cfg.tgl_tutup_gajian) || 25
      const period = payrollPeriod(new Date(), cutoff)
      const payDate = paymentDate(period.end, cutoff, Number(cfg.tgl_bayar_gajian) || 27)
      // Payroll totals MUST come from getGaji, the same API used by Keuangan and DetailKaryawan.
      const payroll = await Promise.allSettled(people.map(p => getGaji(p.id, null, null, {dari:period.dari,sampai:period.sampai})))
      const failed = payroll.filter(r => r.status === 'rejected')
      const totalPayroll = payroll.filter(r => r.status === 'fulfilled').reduce((sum,r) => sum + Number(r.value.data?.gaji_bersih || 0),0)
      const byPerson = new Map(absen.map(a=>[String(a.karyawan_id),a.status]))
      const counts = {hadir:0,sakit:0,izin:0,libur:0,belum:0}
      people.forEach(p=>{const s=byPerson.get(String(p.id)); if(s in counts) counts[s]++; else counts.belum++})
      const totalPasang = produksi.reduce((sum,p)=>sum+Number(p.jumlah_pasang||0),0)
      const targetPasang = people.reduce((sum,p)=>sum+(Number(p.target_pasang)||5),0)
      const recorded = new Set(produksi.map(p=>String(p.karyawan_id)))
      setSummary({people:people.length,counts,totalPayroll,failed:failed.length,period,payDate,totalPasang,targetPasang,recorded:recorded.size,unrecorded:people.length-recorded.size})
    } catch(e) {setError(e?.message || 'Gagal memuat dashboard')}
    finally {setLoading(false)}
  }
  useEffect(()=>{loadData()},[])
  if (loading) return <main className="sf-page"><div className="sf-page-heading"><h2>Dashboard</h2></div><p className="sf-muted">Memuat ringkasan...</p></main>
  if (error) return <main className="sf-page"><div className="sf-page-heading"><h2>Dashboard</h2></div><div className="sf-error">{error}</div><button className="sf-button" onClick={loadData}>Coba Lagi</button></main>
  const s=summary, c=s.counts
  const payrollSub = `${shortDate(s.period.start)}–${shortDate(s.period.end)} · Bayar ${shortDate(s.payDate)}`
  return <main className="sf-page sf-dashboard">
    <div className="sf-page-heading sf-heading-row"><h2>Dashboard</h2><button type="button" className="sf-icon-action" onClick={loadData} aria-label="Perbarui dashboard">↻</button></div>
    <div className="sf-section-label">Hari Ini</div>
    <div className="sf-kpi-grid">
      <div className="sf-kpi"><span>Hadir</span><strong className="sf-green">{c.hadir}</strong><small>dari {s.people} karyawan</small></div>
      <div className="sf-kpi"><span>Sakit / Izin</span><strong className="sf-amber">{c.sakit+c.izin}</strong><small>{c.sakit} sakit · {c.izin} izin</small></div>
      <div className="sf-kpi"><span>Belum Absen</span><strong>{c.belum}</strong><small>{c.libur} libur tercatat</small></div>
      <div className="sf-kpi"><span>Produksi Hari Ini</span><strong className="sf-blue">{s.totalPasang}</strong><small>pasang tercatat</small></div>
    </div>
    <div className="sf-section-label">Payroll</div>
    <section className="sf-card sf-payroll-summary"><span className="sf-muted">Estimasi gaji siklus berjalan</span>
      {s.failed ? <><strong className="sf-payroll-unavailable">Belum tersedia</strong><small className="sf-error-inline">Perhitungan {s.failed} karyawan gagal. Total tidak ditampilkan agar tidak menyesatkan.</small></> : <strong className="sf-payroll-number">{rupiah(s.totalPayroll)}</strong>}
      <small>{payrollSub}</small><button type="button" className="sf-text-link" onClick={()=>navigate('/keuangan')}>Lihat Keuangan <span>›</span></button>
    </section>
    <div className="sf-section-label">Produktivitas</div>
    <section className="sf-card sf-productivity"><div className="sf-productivity-top"><div><span className="sf-muted">Pencatatan produksi</span><strong>{s.recorded} <small>/ {s.people} karyawan</small></strong></div><div className="sf-productivity-right"><span className="sf-muted">Target harian*</span><strong>{s.targetPasang} pasang</strong></div></div>
      <div className="sf-progress"><div style={{width:`${s.people?Math.min(100,100*s.recorded/s.people):0}%`}}/></div>
      <div className="sf-productivity-bottom"><span>{s.unrecorded} belum input</span><button className="sf-text-link" type="button" onClick={()=>navigate('/pasang')}>Bonus Per Pasang ›</button></div>
      <small className="sf-muted sf-footnote">*Akumulasi target individual, bukan target produksi aktual.</small>
    </section>
    <div className="sf-section-label">Akses Cepat</div>
    <div className="sf-quick-grid">
      {[['Karyawan','/karyawan','♙'],['Jadwal','/jadwal','▦'],['Koreksi Absen','/koreksi-absen','✓'],['Pengaturan','/pengaturan','⚙']].map(([name,path,icon])=><button type="button" key={path} onClick={()=>navigate(path)}><span>{icon}</span><strong>{name}</strong><span aria-hidden="true">›</span></button>)}
    </div>
  </main>
}
