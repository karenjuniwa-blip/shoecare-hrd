import { useEffect, useState } from 'react'
import { getKaryawan, getShift, getJadwalKhusus, simpanJadwalKhusus, hapusJadwalKhusus, tukarJadwal } from '../api'

const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const monday = d => { const x = new Date(d); x.setDate(x.getDate()-((x.getDay()+6)%7)); return x }
const input = { width: '100%', boxSizing: 'border-box', padding: 10, background:'var(--bg3)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:8 }
const card = { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:14, marginBottom:12 }
const button = { width:'100%', padding:11, color:'#fff', background:'var(--accent)', border:0, borderRadius:9, fontWeight:700 }

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

  const days = Array.from({length:7},(_,i)=>{ const d = new Date(`${week}T12:00:00`); d.setDate(d.getDate()+i); return iso(d) })
  async function load() {
    setError('')
    try {
      const [k,s,j] = await Promise.all([getKaryawan(),getShift(),getJadwalKhusus(days[0],days[6])])
      setPeople(k.data || []);setShifts(s.data || []);setOverrides(j.data || [])
      const first = k.data?.[0]?.id
      if(first) { setSingle(p=>({...p,karyawan_id:p.karyawan_id || String(first)}));setSwap(p=>({...p,karyawan_a:p.karyawan_a || String(first),karyawan_b:p.karyawan_b || String(first)})) }
    } catch(e) { setError(e.message) }
  }
  useEffect(()=>{load()},[week])
  const shiftOn = (person,date) => {
    const found = overrides.find(j=>j.karyawan_id===person.id && j.tanggal===date)
    if(found) return Number(found.shift_index)
    const day = new Date(`${date}T12:00:00`).getDay()
    return person.jadwal_mingguan?.[(day+6)%7] ?? 0
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
    try{await hapusJadwalKhusus(row.id);await load()}catch(e){setError(e.message)}
  }
  const shiftDate = n => { const d=new Date(`${week}T12:00:00`);d.setDate(d.getDate()+n*7);setWeek(iso(d)) }
  return <main style={{padding:16}}>
    <h2 style={{marginBottom:5}}>Jadwal Karyawan</h2>
    <p style={{fontSize:12,color:'var(--text3)'}}>Pola mingguan tetap tersimpan. Tukar shift hanya membuat perubahan tanggal khusus.</p>
    <section style={card}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}><button onClick={()=>shiftDate(-1)}>‹ Minggu lalu</button><strong style={{fontSize:12}}>{days[0]} – {days[6]}</strong><button onClick={()=>shiftDate(1)}>Minggu depan ›</button></div>
      <div style={{overflowX:'auto'}}><table style={{width:'100%',minWidth:470,borderCollapse:'collapse',fontSize:11}}><thead><tr><th style={{textAlign:'left'}}>Nama</th>{days.map(d=><th key={d} style={{padding:4}}>{new Date(`${d}T12:00:00`).toLocaleDateString('id-ID',{weekday:'short',day:'numeric'})}</th>)}</tr></thead><tbody>{people.map(p=><tr key={p.id}><td style={{padding:'9px 3px',borderTop:'1px solid var(--border)',fontWeight:700}}>{p.nama}</td>{days.map(d=>{const n=shiftOn(p,d);const custom=overrides.some(o=>o.karyawan_id===p.id&&o.tanggal===d);return <td title={custom?'Perubahan khusus':'Pola mingguan'} key={d} style={{padding:3,textAlign:'center',borderTop:'1px solid var(--border)',background:custom?'var(--accentbg)':'transparent',color:Number(n)===3?'var(--red)':'var(--text2)'}}>{Number(n)===3?'Libur':`S${Number(n)+1}`}{custom?'*':''}</td>})}</tr>)}</tbody></table></div>
      <p style={{fontSize:10,color:'var(--text3)'}}>* Jadwal berubah untuk tanggal khusus.</p>
    </section>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginBottom:12}}><button onClick={()=>setMode('tukar')} style={{...button,background:mode==='tukar'?'var(--accent)':'var(--bg3)',color:mode==='tukar'?'white':'var(--text)'}}>Tukar 2 Jadwal</button><button onClick={()=>setMode('manual')} style={{...button,background:mode==='manual'?'var(--accent)':'var(--bg3)',color:mode==='manual'?'white':'var(--text)'}}>Ubah 1 Tanggal</button></div>
    {error && <div role="alert" style={{...card,color:'var(--red)'}}>⚠ {error}</div>}
    {mode==='tukar'?<form onSubmit={saveSwap} style={card}><h3 style={{marginTop:0}}>Tukar Shift / Libur Otomatis</h3><div style={{display:'grid',gap:9}}>
      <label style={{fontSize:12}}>Jadwal A<select required style={input} value={swap.karyawan_a} onChange={e=>setSwap(p=>({...p,karyawan_a:e.target.value}))}>{people.map(p=><option key={p.id} value={p.id}>{p.nama}</option>)}</select></label>
      <input aria-label="Tanggal A" type="date" required value={swap.tanggal_a} onChange={e=>setSwap(p=>({...p,tanggal_a:e.target.value}))} style={input}/>
      <label style={{fontSize:12}}>Jadwal B<select required style={input} value={swap.karyawan_b} onChange={e=>setSwap(p=>({...p,karyawan_b:e.target.value}))}>{people.map(p=><option key={p.id} value={p.id}>{p.nama}</option>)}</select></label>
      <input aria-label="Tanggal B" type="date" required value={swap.tanggal_b} onChange={e=>setSwap(p=>({...p,tanggal_b:e.target.value}))} style={input}/>
      <input placeholder="Alasan pertukaran" value={swap.keterangan} onChange={e=>setSwap(p=>({...p,keterangan:e.target.value}))} style={input}/>
      <button disabled={busy} style={button}>{busy?'Memproses...':'Tukar Jadwal Sekaligus'}</button>
    </div></form>:<form onSubmit={saveSingle} style={card}><h3 style={{marginTop:0}}>Jadwal Khusus 1 Tanggal</h3><div style={{display:'grid',gap:9}}>
      <select required aria-label="Karyawan" style={input} value={single.karyawan_id} onChange={e=>setSingle(p=>({...p,karyawan_id:e.target.value}))}>{people.map(p=><option key={p.id} value={p.id}>{p.nama}</option>)}</select>
      <input type="date" required value={single.tanggal} onChange={e=>setSingle(p=>({...p,tanggal:e.target.value}))} style={input}/>
      <select aria-label="Shift pengganti" value={single.shift_index} onChange={e=>setSingle(p=>({...p,shift_index:Number(e.target.value)}))} style={input}>{shifts.map((s,i)=><option value={i} key={s.id}>{s.nama}</option>)}<option value={3}>Libur</option></select>
      <input placeholder="Alasan" value={single.keterangan} onChange={e=>setSingle(p=>({...p,keterangan:e.target.value}))} style={input}/>
      <button disabled={busy} style={button}>Simpan Jadwal Khusus</button>
    </div></form>}
    <section style={card}><h3 style={{marginTop:0}}>Perubahan Jadwal Minggu Ini</h3>{!overrides.length&&<p style={{fontSize:12,color:'var(--text3)'}}>Tidak ada perubahan.</p>}{overrides.map(o=><div key={o.id} style={{display:'flex',gap:7,justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)',fontSize:12}}><span>{people.find(p=>p.id===o.karyawan_id)?.nama} · {o.tanggal} · {label(o.shift_index)}<div style={{color:'var(--text3)'}}>{o.keterangan}</div></span><button onClick={()=>remove(o)} style={{border:0,background:'transparent',color:'var(--red)'}}>Hapus</button></div>)}</section>
  </main>
}
