import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAdmin } from '../hooks/useAdmin'
import { supabase } from '../lib/supabase'

const items = [
  ['✓', 'Absensi', 'Presensi pada HP toko', '/absen'],
  ['▤', 'Dashboard', 'Ringkasan operasional', '/dashboard'],
  ['◆', 'Bonus Per Pasang', 'Input hasil produksi', '/pasang'],
  ['♙', 'Karyawan', 'Profil, absensi dan slip', '/karyawan'],
  ['▦', 'Jadwal', 'Shift dan tukar libur', '/jadwal'],
  ['Rp', 'Keuangan', 'Kasbon, bonus dan gaji', '/keuangan'],
  ['↺', 'Koreksi Absensi', 'Perbaikan dengan riwayat', '/koreksi-absen'],
  ['⚙', 'Pengaturan', 'Tarif, jabatan, PIN', '/pengaturan'],
]

export default function Home() {
  const navigate = useNavigate()
  const { lock } = useAdmin()
  const [authUser, setAuthUser] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  useEffect(() => {
    supabase.auth.getUser().then(({data}) => setAuthUser(data.user || null))
    const {data: listener} = supabase.auth.onAuthStateChange((_event,session) => setAuthUser(session?.user || null))
    return () => listener.subscription.unsubscribe()
  }, [])
  async function login(e) {
    e.preventDefault();setLoginError('')
    const {error} = await supabase.auth.signInWithPassword({email,password})
    if(error) setLoginError(error.message)
    else setPassword('')
  }
  return <main style={{ padding: 16 }}>
    <h2 style={{ margin: '6px 0' }}>Home</h2>
    <div style={{ background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:12,padding:13,marginBottom:13 }}>
      {authUser ? <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center'}}><p style={{fontSize:11,color:'var(--green)',margin:0}}>✓ Sesi database aktif: {authUser.email}</p><button type="button" onClick={()=>supabase.auth.signOut()} style={{border:0,borderRadius:7,padding:8,background:'var(--bg3)',color:'var(--text)',fontSize:11}}>Ganti akun</button></div> : <>
        <p style={{fontSize:12,marginTop:0}}>Aktivasi akses database admin (sekali per sesi)</p>
        <form onSubmit={login} style={{display:'grid',gap:7}}>
          <input type="email" required placeholder="Email admin Supabase Auth" value={email} onChange={e=>setEmail(e.target.value)} style={{padding:9,background:'var(--bg3)',color:'var(--text)',border:'1px solid var(--border)',borderRadius:8}} />
          <input type="password" required placeholder="Password admin" value={password} onChange={e=>setPassword(e.target.value)} style={{padding:9,background:'var(--bg3)',color:'var(--text)',border:'1px solid var(--border)',borderRadius:8}} />
          <button type="submit" style={{background:'var(--accent)',color:'#fff',border:0,borderRadius:8,padding:10,fontWeight:700}}>Aktifkan Sesi Admin</button>
        </form>{loginError && <p style={{color:'var(--red)',fontSize:11}}>{loginError}</p>}
      </>}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {items.map(([icon, name, description, path]) => <button type="button" key={path} onClick={() => { if (path === '/absen') lock(); navigate(path) }}
        style={{ textAlign: 'left', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 13, padding: 15, color: 'var(--text)', cursor: 'pointer', minHeight: 115, fontFamily: 'inherit' }}>
        <div style={{ fontSize: 25, fontWeight: 700, color: 'var(--accent)', marginBottom: 10 }}>{icon}</div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{name}</div>

      </button>)}
    </div>
    <button type="button" onClick={() => { lock(); navigate('/absen', { replace: true }) }} style={{ marginTop: 18, width: '100%', padding: 13, background: 'var(--greenbg)', color: 'var(--green)', border: '1px solid var(--greenborder)', borderRadius: 10, fontWeight: 700 }}>🔒 Kunci & Kembali ke Absensi</button>
  </main>
}
