import { useState, useRef } from 'react'
import { useNavigate }     from 'react-router-dom'
import { createKaryawan, getJabatan } from '../api'
import { useEffect }       from 'react'
import axios               from 'axios'

const DAYS = ['Sen','Sel','Rab','Kam','Jum','Sab','Min']
const API  = import.meta.env.VITE_API_URL

export default function TambahKaryawan() {
  const navigate  = useNavigate()
  const fotoRef   = useRef()
  const [jabList,  setJabList]  = useState([])
  const [preview,  setPreview]  = useState(null)  // preview URL lokal
  const [fotoFile, setFotoFile] = useState(null)  // file object
  const [jadwal,   setJadwal]   = useState([0,0,0,0,0,1,2])
  const [loading,  setLoading]  = useState(false)
  const [form, setForm] = useState({
    nama:'', jabatan_id:'', shift_id:'', tanggal_masuk:''
  })

  useEffect(() => {
    getJabatan().then(r => {
      setJabList(r.data)
      if (r.data.length) setForm(f => ({...f, jabatan_id: r.data[0].id}))
    })
  }, [])

  function pilihFoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setFotoFile(file)
    setPreview(URL.createObjectURL(file))
  }

  function cycleJadwal(i) {
    const j = [...jadwal]; j[i] = (j[i]+1)%3; setJadwal(j)
  }

  async function simpan() {
    if (!form.nama || !form.jabatan_id || !form.shift_id)
      return alert('Nama, jabatan, dan shift wajib diisi')
    setLoading(true)
    try {
      // 1. Simpan data karyawan
      const { data: kary } = await createKaryawan({
        ...form, jadwal_mingguan: jadwal
      })
      // 2. Upload foto jika ada
      if (fotoFile) {
        const fd = new FormData()
        fd.append('foto', fotoFile)
        await axios.post(`${API}/upload/foto/${kary.id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }
      navigate('/dashboard')
    } catch(e) {
      alert('Gagal menyimpan: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const inp = (field) => ({
    value: form[field],
    onChange: e => setForm(f=>({...f,[field]:e.target.value})),
    style:{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',color:'var(--text)',fontSize:13,padding:'10px 12px',width:'100%',fontFamily:'inherit',outline:'none',marginTop:4}
  })

  const shiftCfg=[
    {bg:'var(--accentbg,#1e2d4a)',bc:'var(--accent)',c:'var(--accent)',l:'S1'},
    {bg:'var(--amberbg)',bc:'var(--amber)',c:'var(--amber)',l:'S2'},
    {bg:'var(--redbg)',bc:'var(--red)',c:'var(--red)',l:'L'},
  ]

  return (
    <div style={{paddingBottom:24}}>
      {/* Back header */}
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'14px 20px 12px',borderBottom:'1px solid var(--border)'}}>
        <button onClick={()=>navigate('/dashboard')}
          style={{background:'none',border:'none',color:'var(--text2)',cursor:'pointer',fontSize:20,lineHeight:1}}>←</button>
        <div style={{fontSize:16,fontWeight:700}}>Tambah Karyawan</div>
      </div>

      {/* FOTO PROFIL — seperti Instagram */}
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'24px 20px 16px',borderBottom:'1px solid var(--border)'}}>
        <div style={{position:'relative',marginBottom:12}} onClick={()=>fotoRef.current.click()}>
          {/* Avatar / preview */}
          <div style={{
            width:96,height:96,borderRadius:'50%',
            background: preview ? 'transparent' : 'var(--bg3)',
            border:'3px solid var(--accent)',
            overflow:'hidden',display:'flex',
            alignItems:'center',justifyContent:'center',
            cursor:'pointer'
          }}>
            {preview
              ? <img src={preview} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              : <span style={{fontSize:36}}>👤</span>
            }
          </div>
          {/* Tombol kamera — persis seperti Instagram */}
          <div style={{
            position:'absolute',bottom:0,right:0,
            width:28,height:28,borderRadius:'50%',
            background:'var(--accent)',border:'2px solid var(--bg)',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:13,cursor:'pointer'
          }}>📷</div>
        </div>
        <div style={{fontSize:13,color:'var(--accent)',fontWeight:600,cursor:'pointer'}}
          onClick={()=>fotoRef.current.click()}>
          {preview ? 'Ganti foto' : 'Tambah foto profil'}
        </div>
        <input ref={fotoRef} type="file" accept="image/*" capture="environment"
          style={{display:'none'}} onChange={pilihFoto}/>
      </div>

      {/* Form data */}
      <div style={{padding:'16px 20px'}}>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,color:'var(--text3)',fontWeight:500}}>Nama lengkap *</div>
          <input placeholder="Contoh: Budi Santoso" {...inp('nama')}/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
          <div>
            <div style={{fontSize:11,color:'var(--text3)',fontWeight:500}}>Jabatan *</div>
            <select {...inp('jabatan_id')}>
              <option value="">Pilih</option>
              {jabList.map(j=><option key={j.id} value={j.id}>{j.nama}</option>)}
            </select>
          </div>
          <div>
            <div style={{fontSize:11,color:'var(--text3)',fontWeight:500}}>Shift *</div>
            <select {...inp('shift_id')}>
              <option value="">Pilih</option>
              {/* Isi dari API shift */}
              <option value="shift1">Shift 1 · 07:00</option>
              <option value="shift2">Shift 2 · 13:00</option>
            </select>
          </div>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,color:'var(--text3)',fontWeight:500}}>Tanggal mulai kerja</div>
          <input type="date" {...inp('tanggal_masuk')}/>
        </div>

        {/* Jadwal mingguan */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:11,color:'var(--text3)',fontWeight:500,marginBottom:8}}>Jadwal shift mingguan</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:6}}>
            {DAYS.map((d,i) => {
              const v=jadwal[i]; const c=shiftCfg[v]
              return <div key={d} style={{textAlign:'center'}}>
                <div style={{fontSize:9,color:'var(--text3)',fontWeight:600,marginBottom:4}}>{d}</div>
                <button onClick={()=>cycleJadwal(i)}
                  style={{width:34,height:34,borderRadius:8,border:`1.5px solid ${c.bc}`,background:c.bg,color:c.c,cursor:'pointer',fontSize:9,fontWeight:700,fontFamily:'inherit'}}>{c.l}</button>
              </div>
            })}
          </div>
        </div>

        <button onClick={simpan} disabled={loading}
          style={{width:'100%',padding:13,background:'var(--accent)',color:'#fff',border:'none',borderRadius:'var(--radius)',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:loading?0.6:1}}>
          {loading ? 'Menyimpan...' : 'Simpan Karyawan'}
        </button>
      </div>
    </div>
  )
}