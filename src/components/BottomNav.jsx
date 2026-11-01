
import { useLocation, useNavigate } from 'react-router-dom'
import { useAdmin } from '../hooks/useAdmin'

const menus = [
  { path: '/absen', label: 'Absensi', icon: '✓' },
  { path: '/home', label: 'Home', icon: '⌂' }
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAdmin } = useAdmin()
  const current = location.pathname

  return (
    <nav
      aria-label="Navigasi utama"
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 420,
        background: 'var(--bg2)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        padding: '9px 0 14px',
        zIndex: 100
      }}
    >
      {menus.map(item => {
        const active =
          item.path === '/absen'
            ? current === '/absen' || current === '/'
            : current !== '/absen' && current !== '/'

        return (
          <button
            type="button"
            key={item.path}
            onClick={() => navigate(item.path)}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              background: 'none',
              border: 'none',
              color: active
                ? 'var(--accent)'
                : 'var(--text3)',
              cursor: 'pointer',
              padding: '3px 0',
              fontFamily: 'inherit'
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontSize: 23,
                lineHeight: 1
              }}
            >
              {item.icon}
            </span>

            <span
              style={{
                fontSize: 12,
                fontWeight: active ? 700 : 500
              }}
            >
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
