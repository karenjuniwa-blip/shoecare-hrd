import { useEffect, useState } from 'react'
import { getKaryawan, getShift, getJadwalKhusus, simpanJadwalKhusus, hapusJadwalKhusus, tukarJadwal } from '../api'

const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const monday = d => { const x = new Date(d); x.setDate(x.getDate()-((x.getDay()+6)%7)); return x }
const formatDate = (d, opts) => new Date(`${d}T12:00:00`).toLocaleDateString('id-ID',opts)
const dateAt = (date, offset) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate()+offset); return iso(d) }

export default function Jadwal() {
  const [people,setPeople] = useState([])
  const [shifts,setShifts] = useState([])
  const [week,setWeek] = useState(iso(monday(new Date())))
  const [overrides,setOverrides] = useState([])
  const [mode,setMode] = useState('tukar')
  const [swap,setSwap] = useState({ karyawan_a:'', tanggal_a:iso(new Date()), karyawan_b:'', tanggal_b:iso(new Date()), keterangan:'' })
  const [single,setSingle] = useState({ karyawan_id:'', tanggal:iso(new Date()), shift_index:3, keterangan:'' })
  const [error,setError] = useState('')
  const [busy,setBusy] = useState(false)
  const [loading,setLoading] = useState(true)
  const days = Array.from({length:7},(_,i)=>dateAt(week,i))
  async function load() {
    setError(''); setLoading(true)
    try {
      const [k,s,j] = await Promise.all([getKaryawan(),getShift(),getJadwalKhusus(days[0],days[6])])
      setPeople(k.data || []); setShifts(s.data || []); setOverrides(j.data || [])
      const first = k.data?.[0]?.id
      if(first) {
        setSingle(p=>({...p,karyawan_id:p.karyawan_id || String(first)}))
        setSwap(p=>({...p,karyawan_a:p.karyawan_a || String(first),karyawan_b:p.karyawan_b || String(first)}))
      }
    } catch(e) { setError(e.message) } finally { setLoading(false) }
  }
  useEffect(()=>{load()},[week])
  const shiftOn = (person,date) => {
    const found = overrides.find(j=>String(j.karyawan_id)===String(person.id) && j.tanggal===date)
    if(found) return Number(found.shift_index)
    const day = new Date(`${date}T12:00:00`).getDay()
    return Number(person.jadwal_mingguan?.[(day+6)%7] ?? 3)
  }
  const label = n => Number(n)===3?'Libur':shifts[Number(n)]?.nama || `Shift ${Number(n)+1}`
  async function saveSingle(e) {
    e.preventDefault();setBusy(true);setError('')
    try { await simpanJadwalKhusus({...single,shift_index:Number(single.shift_index)});await load() }
    catch(e){setError(e.message)} finally {setBusy(false)}
  }
  async function saveSwap(e) {
    e.preventDefault()
    if(swap.karyawan_a===swap.karyawan_b && swap.tanggal_a===swap.tanggal_b) { setError('Pilih dua jadwal berbeda.');return }
    if(!window.confirm('Tukar kedua jadwal ini secara bersamaan?')) return
    setBusy(true);setError('')
    try { await tukarJadwal(swap);await load() }
    catch(e){setError(e.message)} finally{setBusy(false)}
  }
  async function remove(row) {
    if(!window.confirm(`Kembalikan jadwal ${row.tanggal} ke pola mingguan?`))return
    setBusy(true)
    try{await hapusJadwalKhusus(row.id);await load()}catch(e){setError(e.message)}finally{setBusy(false)}
  }
  const range = `${formatDate(days[0],{day:'numeric',month:'short'})} – ${formatDate(days[6],{day:'numeric',month:'short',year:'numeric'})}`
  return <main className="sf-page sf-schedule">
    <div className="sf-page-heading"><h2>Jadwal Karyawan</h2></div>
    <section className="sf-card">
      <div className="sf-week-picker">
        <button type="button" aria-label="Minggu sebelumnya" onClick={()=>setWeek(dateAt(week,-7))}>‹</button>
        <div><span className="sf-week-eyebrow">PERIODE MINGGUAN</span><strong>{range}</strong></div>
        <button type="button" aria-label="Minggu berikutnya" onClick={()=>setWeek(dateAt(week,7))}>›</button>
      </div>
      <div className="sf-table-scroll"><table className="sf-schedule-table"><thead><tr><th>Nama</th>{days.map(d=><th key={d}>{formatDate(d,{weekday:'short',day:'numeric'})}</th>)}</tr></thead><tbody>{people.map(p=><tr key={p.id}><th scope="row">{p.nama}</th>{days.map(d=>{const n=shiftOn(p,d);const custom=overrides.some(o=>String(o.karyawan_id)===String(p.id)&&o.tanggal===d);return <td key={d}><span className={`sf-shift-chip ${Number(n)===3?'sf-off':''} ${custom?'sf-custom':''}`} title={custom?'Jadwal khusus':label(n)}>{Number(n)===3?'L':`S${Number(n)+1}`}{custom?'*':''}</span></td>})}</tr>)}</tbody></table></div>
      {loading && <p className="sf-muted">Memuat jadwal...</p>}
      <div className="sf-schedule-legend"><span>S1–S3 Shift</span><span>L Libur</span><span>* Khusus</span></div>
    </section>
    <div className="sf-segment" role="group" aria-label="Jenis perubahan jadwal"><button type="button" className={mode==='tukar'?'active':''} onClick={()=>setMode('tukar')}>Tukar Jadwal</button><button type="button" className={mode==='manual'?'active':''} onClick={()=>setMode('manual')}>Ubah Tanggal</button></div>
    {error && <div role="alert" className="sf-error">{error}</div>}
    {mode==='tukar' ? <form onSubmit={saveSwap} className="sf-card sf-form"><h3>Tukar Shift / Libur</h3>
      <div className="sf-form-grid"><label>Jadwal A<select required value={swap.karyawan_a} onChange={e=>setSwap(p=>({...p,karyawan_a:e.target.value}))}>{people.map(p=><option key={p.id} value={p.id}>{p.nama}</option>)}</select></label>
      <label>Tanggal A<input type="date" required value={swap.tanggal_a} onChange={e=>setSwap(p=>({...p,tanggal_a:e.target.value}))}/></label>
      <label>Jadwal B<select required value={swap.karyawan_b} onChange={e=>setSwap(p=>({...p,karyawan_b:e.target.value}))}>{people.map(p=><option key={p.id} value={p.id}>{p.nama}</option>)}</select></label>
      <label>Tanggal B<input type="date" required value={swap.tanggal_b} onChange={e=>setSwap(p=>({...p,tanggal_b:e.target.value}))}/></label>
      <label>Alasan<input value={swap.keterangan} onChange={e=>setSwap(p=>({...p,keterangan:e.target.value}))} placeholder="Alasan pertukaran" /></label>
      <button className="sf-button" disabled={busy || !people.length}>{busy?'Memproses...':'Tukar Jadwal'}</button></div></form> :
      <form onSubmit={saveSingle} className="sf-card sf-form"><h3>Jadwal Khusus</h3><div className="sf-form-grid">
      <label>Karyawan<select required value={single.karyawan_id} onChange={e=>setSingle(p=>({...p,karyawan_id:e.target.value}))}>{people.map(p=><option key={p.id} value={p.id}>{p.nama}</option>)}</select></label>
      <label>Tanggal<input type="date" required value={single.tanggal} onChange={e=>setSingle(p=>({...p,tanggal:e.target.value}))}/></label>
      <label>Shift<select value={single.shift_index} onChange={e=>setSingle(p=>({...p,shift_index:Number(e.target.value)}))}>{shifts.map((s,i)=><option value={i} key={s.id}>{s.nama}</option>)}<option value={3}>Libur</option></select></label>
      <label>Alasan<input placeholder="Alasan" value={single.keterangan} onChange={e=>setSingle(p=>({...p,keterangan:e.target.value}))}/></label>
      <button className="sf-button" disabled={busy || !people.length}>Simpan Jadwal</button></div></form>}
    <section className="sf-card sf-history"><h3>Perubahan Minggu Ini</h3>{!overrides.length&&<p className="sf-muted">Belum ada perubahan.</p>}{overrides.map(o=><div className="sf-history-row" key={o.id}><span><strong>{people.find(p=>String(p.id)===String(o.karyawan_id))?.nama || 'Karyawan'}</strong><small>{formatDate(o.tanggal,{day:'numeric',month:'short'})} · {label(o.shift_index)}{o.keterangan ? ` · ${o.keterangan}` : ''}</small></span><button type="button" disabled={busy} onClick={()=>remove(o)}>Hapus</button></div>)}</section>
  </main>
}
