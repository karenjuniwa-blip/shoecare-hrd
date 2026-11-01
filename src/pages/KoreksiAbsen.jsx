import { useEffect, useState } from 'react'
import { getKaryawan, getAbsensi, koreksiAbsensi, getAudit } from '../api'

const iso = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
const inp = {width:'100%',boxSizing:'border-box',padding:10,background:'var(--bg3)',color:'var(--text)',border:'1px solid var(--border)',borderRadius:8}
export default function KoreksiAbsen() {
  const [people,setPeople] = useState([])
  const [form,setForm] = useState({karyawan_id:'',tanggal:iso(),status:'hadir',jam_masuk:'',jam_keluar:'',alasan:''})
  const [old,setOld] = useState(null)
  const [history,setHistory] = useState([])
  const [error,setError] = useState('')
  const [busy,setBusy] = useState(false)
  useEffect(()=>{getKaryawan().then(r=>{setPeople(r.data||[]);if(r.data?.length)setForm(f=>({...f,karyawan_id:String(r.data[0].id)}))}).catch(e=>setError(e.message));getAudit().then(r=>setHistory((r.data||[]).filter(a=>a.kategori==='absensi'))).catch(e=>setError(e.message))},[])
  useEffect(()=>{if(!form.karyawan_id)return;getAbsensi(form.tanggal).then(r=>{const a=(r.data||[]).find(a=>a.karyawan_id===form.karyawan_id);setOld(a||null);if(a)setForm(f=>({...f,status:a.status,jam_masuk:a.jam_masuk||'',jam_keluar:a.jam_keluar||''}))}).catch(e=>setError(e.message))},[form.karyawan_id,form.tanggal])
  async function submit(e){e.preventDefault();setError('');setBusy(true);try{if(form.alasan.trim().length<5)throw new Error('Alasan koreksi minimal 5 karakter');await koreksiAbsensi(form);alert('Koreksi tersimpan dan dicatat dalam audit');const r=await getAudit();setHistory((r.data||[]).filter(a=>a.kategori==='absensi'));setForm(f=>({...f,alasan:''}))}catch(e){setError(e.message)}finally{setBusy(false)}}
  return <main style={{padding:16}}><h2>Koreksi Absensi</h2><p style={{fontSize:12,color:'var(--text3)'}}>Hanya untuk admin. Semua koreksi wajib memiliki alasan dan tersimpan dalam riwayat.</p>
    {error&&<div role="alert" style={{padding:12,color:'var(--red)'}}>{error}</div>}
    <form onSubmit={submit} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:12,padding:14,display:'grid',gap:10}}>
      <label>Karyawan<select required value={form.karyawan_id} onChange={e=>setForm(p=>({...p,karyawan_id:e.target.value}))} style={inp}>{people.map(p=><option value={p.id} key={p.id}>{p.nama}</option>)}</select></label>
      <label>Tanggal<input type="date" required value={form.tanggal} onChange={e=>setForm(p=>({...p,tanggal:e.target.value}))} style={inp}/></label>
      <p style={{fontSize:11,color:'var(--text3)',margin:0}}>Catatan saat ini: {old?.status||'Belum ada'} · {old?.jam_masuk||'—'} / {old?.jam_keluar||'—'}</p>
      <label>Status<select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={inp}>{['hadir','sakit','izin','libur'].map(s=><option key={s} value={s}>{s}</option>)}</select></label>
      <label>Jam masuk<input type="time" value={form.jam_masuk} onChange={e=>setForm(p=>({...p,jam_masuk:e.target.value}))} style={inp}/></label>
      <label>Jam keluar<input type="time" value={form.jam_keluar} onChange={e=>setForm(p=>({...p,jam_keluar:e.target.value}))} style={inp}/></label>
      <label>Alasan<textarea required minLength={5} value={form.alasan} onChange={e=>setForm(p=>({...p,alasan:e.target.value}))} style={inp} rows={3}/></label>
      <button type="submit" disabled={busy} style={{padding:12,background:'var(--accent)',color:'white',border:0,borderRadius:9,fontWeight:700}}>{busy?'Menyimpan...':'Simpan Koreksi'}</button>
    </form>
    <h3>Riwayat Koreksi Terbaru</h3>{history.filter(a=>a.aksi==='koreksi').slice(0,15).map(a=><div key={a.id} style={{padding:12,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:10,marginBottom:8,fontSize:11}}><strong>{new Date(a.waktu).toLocaleString('id-ID')}</strong><div>{a.rincian?.alasan||'Koreksi'} · {a.rincian?.tanggal||''}</div></div>)}
  </main>
}
