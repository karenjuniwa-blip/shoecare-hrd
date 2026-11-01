import { useEffect, useState } from 'react'
import { getKaryawan, getBonusRentang, postBonus, deleteBonus, getKasbon, buatKasbon, getCicilanKasbon, tambahCicilanKasbon, getGaji, getPengaturan, getPayrollSnapshot, simpanPayrollSnapshot, rupiah } from '../api'

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
const field = { width: '100%', boxSizing: 'border-box', padding: 10, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontFamily: 'inherit' }
const btn = { width: '100%', padding: 11, background: 'var(--accent)', border: 0, borderRadius: 9, color: '#fff', fontWeight: 700, cursor: 'pointer' }
const card = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 13, padding: 14, marginBottom: 12 }

function periodeAwal(d, cutoff) {
  const x = new Date(`${d}T12:00:00`)
  const y = x.getFullYear(), m = x.getMonth()
  const akhir = new Date(y, m, Math.min(cutoff, new Date(y, m+1, 0).getDate()))
  const previous = x.getDate() <= cutoff ? new Date(y, m-1, Math.min(cutoff, new Date(y, m, 0).getDate())) : akhir
  const awal = new Date(previous.getFullYear(), previous.getMonth(), previous.getDate()+1)
  const selesai = x.getDate() <= cutoff ? akhir : new Date(y,m+1,Math.min(cutoff,new Date(y,m+2,0).getDate()))
  const fmt = t => `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`
  return { dari: fmt(awal), sampai: fmt(selesai) }
}

export default function Keuangan() {
  const [tab, setTab] = useState('bonus')
  const [people, setPeople] = useState([])
  const [person, setPerson] = useState('')
  const [period, setPeriod] = useState({ dari: today(), sampai: today() })
  const [form, setForm] = useState({ tanggal: today(), tipe: 'bonus', nominal: '', keterangan: '' })
  const [kasbonForm, setKasbonForm] = useState({ tanggal: today(), nominal: '', cicilan_nominal: '', keterangan: '' })
  const [cicilanForm, setCicilanForm] = useState({ kasbon_id: '', tanggal: today(), nominal: '', keterangan: '' })
  const [transaksi, setTransaksi] = useState([])
  const [pinjaman, setPinjaman] = useState([])
  const [cicilan, setCicilan] = useState([])
  const [gaji, setGaji] = useState(null)
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getKaryawan(), getPengaturan()]).then(([k,c]) => {
      setPeople(k.data || [])
      if (k.data?.length) setPerson(String(k.data[0].id))
      setPeriod(periodeAwal(today(), Number(c.data?.tgl_tutup_gajian) || 25))
    }).catch(e => setError(e.message))
  }, [])

  async function refresh() {
    if (!person || !period.dari || !period.sampai || period.dari > period.sampai) return
    setLoading(true); setError('')
    try {
      const [t, k, c, g, s] = await Promise.all([
        getBonusRentang(person, period.dari, period.sampai),
        getKasbon(person), getCicilanKasbon(null, null, person),
        getGaji(person, null, null, period), getPayrollSnapshot(person, period.dari, period.sampai),
      ])
      setTransaksi(t.data || []); setPinjaman(k.data || []); setCicilan(c.data || [])
      setGaji(g.data); setSnapshot(s.data)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { refresh() }, [person, period.dari, period.sampai])

  async function submitBonus(e) {
    e.preventDefault()
    try {
      if (snapshot?.status === 'dibayar') throw new Error('Periode ini sudah dibayar dan dikunci.')
      await postBonus({ karyawan_id: person, ...form })
      setForm(p => ({ ...p, nominal: '', keterangan: '' }))
      await refresh()
    } catch (e) { setError(e.message) }
  }

  async function submitKasbon(e) {
    e.preventDefault()
    try {
      await buatKasbon({ karyawan_id: person, ...kasbonForm, cicilan_nominal: Number(kasbonForm.cicilan_nominal || 0) })
      setKasbonForm(p => ({ ...p, nominal: '', keterangan: '' })); await refresh()
    } catch (e) { setError(e.message) }
  }

  async function submitCicilan(e) {
    e.preventDefault()
    try {
      if (snapshot?.status === 'dibayar') throw new Error('Periode ini sudah dibayar dan dikunci.')
      await tambahCicilanKasbon(cicilanForm)
      setCicilanForm(p => ({ ...p, nominal: '', keterangan: '' })); await refresh()
    } catch (e) { setError(e.message) }
  }

  async function hapus(t) {
    if (!window.confirm(`Hapus transaksi ${rupiah(t.nominal)}?`)) return
    try { if (snapshot?.status === 'dibayar') throw new Error('Periode terkunci'); await deleteBonus(t.id); await refresh() }
    catch (e) { setError(e.message) }
  }

  async function simpanStatus(status) {
    if (!window.confirm(status === 'dibayar' ? 'Tandai gaji DIBAYAR dan kunci nominal periode ini?' : 'Simpan ringkasan gaji periode ini sebagai draft?')) return
    try {
      if (snapshot?.status === 'dibayar') throw new Error('Gaji dibayar tidak boleh diubah.')
      if (status === 'dibayar' && snapshot?.status !== 'disetujui') throw new Error('Setujui gaji terlebih dahulu.')
      if (status === 'disetujui' && !snapshot) throw new Error('Simpan draft terlebih dahulu.')
      await simpanPayrollSnapshot({ karyawan_id: person, periode_dari: period.dari, periode_sampai: period.sampai, status, rincian: gaji, total_bersih: gaji.gaji_bersih, dibayar_pada: status === 'dibayar' ? new Date().toISOString() : null })
      await refresh()
    } catch (e) { setError(e.message) }
  }

  const saldo = p => Math.max(0, Number(p.nominal) - cicilan.filter(c => c.kasbon_id === p.id).reduce((s,c)=>s+Number(c.nominal),0))
  const activeKasbon = pinjaman.filter(p => saldo(p) > 0)
  const displayGaji = snapshot?.status === 'dibayar' ? snapshot.rincian : gaji
  return <main style={{ padding: 16 }}>
    <h2 style={{ marginBottom: 5 }}>Keuangan</h2>
    <p style={{ color: 'var(--text3)', fontSize: 12 }}>Bonus, kasbon, potongan dan gaji dalam satu tempat.</p>
    <div style={card}>
      <label style={{ fontSize: 11 }}>Karyawan</label>
      <select aria-label="Karyawan" value={person} onChange={e=>setPerson(e.target.value)} style={field}>{people.map(p=><option key={p.id} value={p.id}>{p.nama}</option>)}</select>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
        <div><label style={{ fontSize: 11 }}>Dari</label><input type="date" value={period.dari} onChange={e=>setPeriod(p=>({...p,dari:e.target.value}))} style={field}/></div>
        <div><label style={{ fontSize: 11 }}>Sampai</label><input type="date" value={period.sampai} onChange={e=>setPeriod(p=>({...p,sampai:e.target.value}))} style={field}/></div>
      </div>
    </div>
    {error && <div role="alert" style={{ ...card, color: 'var(--red)' }}>⚠ {error}</div>}
    {loading && <p style={{ color: 'var(--text3)' }}>Memuat...</p>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 14 }}>
      {[['bonus','Bonus'],['kasbon','Kasbon'],['gaji','Gaji']].map(([key,name]) => <button key={key} onClick={()=>setTab(key)} style={{ padding: 10, borderRadius: 9, border: '1px solid var(--border)', background: tab===key ? 'var(--accent)' : 'var(--bg2)', color: tab===key ? '#fff' : 'var(--text)', fontWeight: 700 }}>{name}</button>)}
    </div>
    {tab === 'bonus' && <>
      <form onSubmit={submitBonus} style={card}>
        <h3 style={{ marginTop: 0 }}>Tambah Bonus / Potongan</h3>
        <div style={{ display:'grid', gap: 9 }}>
          <select value={form.tipe} onChange={e=>setForm(p=>({...p,tipe:e.target.value}))} style={field}><option value="bonus">Bonus</option><option value="potongan">Potongan lainnya</option></select>
          <input type="date" required value={form.tanggal} onChange={e=>setForm(p=>({...p,tanggal:e.target.value}))} style={field}/>
          <input type="number" min="1" required placeholder="Nominal (Rp)" value={form.nominal} onChange={e=>setForm(p=>({...p,nominal:e.target.value}))} style={field}/>
          <input placeholder="Keterangan" value={form.keterangan} onChange={e=>setForm(p=>({...p,keterangan:e.target.value}))} style={field}/>
          <button type="submit" style={btn}>Simpan Transaksi</button>
        </div>
      </form>
      <section style={card}><h3>Riwayat Transaksi</h3>{!transaksi.length && <p style={{ fontSize: 12, color:'var(--text3)' }}>Belum ada transaksi.</p>}{transaksi.map(t=><div key={t.id} style={{ display:'flex',justifyContent:'space-between',gap:8,padding:'9px 0',borderBottom:'1px solid var(--border)',fontSize:12 }}><span>{t.tanggal} · {t.keterangan || (t.tipe === 'bonus' ? 'Bonus' : 'Potongan')}</span><strong>{t.tipe==='bonus'?'+':'−'}{rupiah(t.nominal)}</strong><button onClick={()=>hapus(t)} style={{ color:'var(--red)',border:0,background:'transparent' }}>Hapus</button></div>)}</section>
    </>}
    {tab === 'kasbon' && <>
      <form onSubmit={submitKasbon} style={card}><h3 style={{marginTop:0}}>Catat Pencairan Kasbon</h3><div style={{display:'grid',gap:9}}>
        <input aria-label="Tanggal pencairan" type="date" required value={kasbonForm.tanggal} onChange={e=>setKasbonForm(p=>({...p,tanggal:e.target.value}))} style={field}/>
        <input aria-label="Nominal pinjaman" type="number" min="1" required placeholder="Nominal pinjaman (Rp)" value={kasbonForm.nominal} onChange={e=>setKasbonForm(p=>({...p,nominal:e.target.value}))} style={field}/>
        <input aria-label="Cicilan rencana" type="number" min="0" placeholder="Rencana cicilan tiap gajian (Rp)" value={kasbonForm.cicilan_nominal} onChange={e=>setKasbonForm(p=>({...p,cicilan_nominal:e.target.value}))} style={field}/>
        <input placeholder="Keterangan" value={kasbonForm.keterangan} onChange={e=>setKasbonForm(p=>({...p,keterangan:e.target.value}))} style={field}/>
        <button type="submit" style={btn}>Catat Kasbon</button>
      </div></form>
      <section style={card}><h3>Saldo Kasbon</h3>{!pinjaman.length && <p style={{fontSize:12,color:'var(--text3)'}}>Belum ada kasbon.</p>}{pinjaman.map(p=><div key={p.id} style={{padding:'10px 0',borderBottom:'1px solid var(--border)',fontSize:12}}><strong>{p.tanggal} · {rupiah(p.nominal)}</strong><div style={{color:'var(--text3)',marginTop:4}}>Sisa: {rupiah(saldo(p))} · Cicilan rencana: {rupiah(p.cicilan_nominal || 0)}</div><div>{p.keterangan}</div></div>)}</section>
      {activeKasbon.length > 0 && <form onSubmit={submitCicilan} style={card}><h3 style={{marginTop:0}}>Potong Cicilan dari Gaji</h3><div style={{display:'grid',gap:9}}>
        <select aria-label="Pilih kasbon" required value={cicilanForm.kasbon_id} onChange={e=>setCicilanForm(p=>({...p,kasbon_id:e.target.value}))} style={field}><option value="">Pilih kasbon</option>{activeKasbon.map(p=><option key={p.id} value={p.id}>{p.tanggal} · Sisa {rupiah(saldo(p))}</option>)}</select>
        <input type="date" required value={cicilanForm.tanggal} onChange={e=>setCicilanForm(p=>({...p,tanggal:e.target.value}))} style={field}/>
        <input type="number" required min="1" placeholder="Nominal cicilan (Rp)" value={cicilanForm.nominal} onChange={e=>setCicilanForm(p=>({...p,nominal:e.target.value}))} style={field}/>
        <input placeholder="Keterangan" value={cicilanForm.keterangan} onChange={e=>setCicilanForm(p=>({...p,keterangan:e.target.value}))} style={field}/>
        <button type="submit" style={btn}>Catat Potongan Cicilan</button>
      </div></form>}
      <section style={card}><h3>Riwayat Cicilan</h3>{cicilan.map(c=><div key={c.id} style={{padding:'7px 0',borderBottom:'1px solid var(--border)',fontSize:12}}>{c.tanggal} · −{rupiah(c.nominal)} · {c.keterangan}</div>)}</section>
    </>}
    {tab === 'gaji' && <section style={card}>
      <h3 style={{marginTop:0}}>Rekap Gaji</h3>
      {displayGaji && <>{[
        ['Gaji pokok',displayGaji.rincian.gaji_pokok], ['Tunjangan',displayGaji.rincian.tunjangan], ['Bonus pasang',displayGaji.rincian.bonus_pasang], ['Bonus lainnya',displayGaji.rincian.bonus_manual], ['Potongan kasbon',-displayGaji.rincian.potongan_kasbon], ['Potongan lainnya',-displayGaji.rincian.potongan_lainnya], ['Potongan absen',-displayGaji.rincian.potongan_absen]
      ].map(([label,val])=><div key={label} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)',fontSize:12}}><span>{label}</span><strong>{val < 0 ? '−':''}{rupiah(Math.abs(val || 0))}</strong></div>)}
        <div style={{display:'flex',justifyContent:'space-between',margin:'15px 0',fontWeight:700}}><span>Total Bersih</span><strong>{rupiah(displayGaji.gaji_bersih)}</strong></div>
        <p style={{fontSize:12,color:'var(--text3)'}}>Status: {snapshot?.status || 'Belum disimpan'}{snapshot?.status==='dibayar'?' (terkunci)':''}</p>
        {snapshot?.status!=='dibayar' && <div style={{display:'grid',gap:8}}>
          <button onClick={()=>simpanStatus('draft')} style={btn}>Simpan Draft Gaji</button>
          {snapshot?.status==='draft'&&<button onClick={()=>simpanStatus('disetujui')} style={{...btn,background:'var(--amber)'}}>Setujui Gaji</button>}
          {snapshot?.status==='disetujui'&&<button onClick={()=>simpanStatus('dibayar')} style={{...btn,background:'var(--green)'}}>Tandai Sudah Dibayar</button>}
        </div>}
        {snapshot?.status==='dibayar' && <p style={{fontSize:11,color:'var(--text3)'}}>Nominal historis tersimpan. Koreksi setelah pembayaran membutuhkan prosedur pembetulan terpisah.</p>}
      </>}
    </section>}
  </main>
}
