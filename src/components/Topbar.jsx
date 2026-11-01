
import { useNavigate, useLocation } from 'react-router-dom'
import { useAdmin } from '../hooks/useAdmin'

export default function Topbar() {
  const { isAdmin, lock } = useAdmin()
  const navigate = useNavigate()
  const location = useLocation()

  const onAbsensi =
    location.pathname === '/absen' ||
    location.pathname === '/'

  const lockAndReturn = () => {
    lock()
    navigate('/absen', { replace: true })
  }

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}
      >
        <span
          style={{
            fontSize: 19,
            fontWeight: 800,
            letterSpacing: '-.4px',
            lineHeight: 1.1
          }}
        >
          Staffora Pro
        </span>

        <span
          style={{
            fontSize: 10,
            color: 'var(--text3)',
            letterSpacing: '.07em',
            textTransform: 'uppercase'
          }}
        >
          Shoecare Management
        </span>
      </div>

      {isAdmin ? (
        <button
          type="button"
          onClick={lockAndReturn}
          style={{
            fontSize: 12,
            padding: '9px 12px',
            borderRadius: 12,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 700,
            background: 'var(--greenbg)',
            color: 'var(--green)',
            border: '1px solid var(--greenborder)'
          }}
        >
          Kunci Admin
        </button>
      ) : (
        <button
          type="button"
          onClick={() => navigate('/home')}
          style={{
            fontSize: 12,
            padding: '9px 12px',
            borderRadius: 12,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 700,
            background: 'var(--bg2)',
            color: 'var(--text)',
            border: '1px solid var(--border)'
          }}
        >
          {onAbsensi ? 'Home · PIN' : 'Masuk Admin'}
        </button>
      )}
    </header>
  )
}
