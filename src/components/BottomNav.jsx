import { useLocation, useNavigate } from 'react-router-dom'

const menus = [
  { path: '/absen',      label: 'Absen',      icon: '👥' },
  { path: '/dashboard',  label: 'Dashboard',  icon: '📊' },
  { path: '/pasang',     label: 'Pasang',     icon: '💰' },
  { path: '/pengaturan', label: 'Pengaturan', icon: '⚙️' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  // Sembunyikan nav di halaman detail
  if (location.pathname.startsWith('/dashboard/')) return null

  return (
    <nav style={{
      position:'fixed', bottom:0, left:'50%',
      transform:'translateX(-50%)', width:'100%', maxWidth:420,
      background:'var(--bg2)', borderTop:'1px solid var(--border)',
      display:'flex', padding:'8px 0 12px', zIndex:100
    }}>
      {menus.map(m => {
        const active = location.pathname === m.path
        return (
          <button key={m.path}
            onClick={() => navigate(m.path)}
            style={{
              flex:1, display:'flex', flexDirection:'column',
              alignItems:'center', gap:3, background:'none', border:'none',
              color: active ? 'var(--accent)' : 'var(--text3)',
              cursor:'pointer', fontSize:20, padding:'4px 0'
            }}>
            <span>{m.icon}</span>
            <span style={{ fontSize:10, fontWeight:500 }}>{m.label}</span>
          </button>
        )
      })}
    </nav>
  )
}