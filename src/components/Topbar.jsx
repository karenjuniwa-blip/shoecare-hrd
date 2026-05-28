import { useState }  from 'react'
import { useAdmin }  from '../hooks/useAdmin'
import PinLock      from './PinLock'

export default function Topbar() {
  const { isAdmin, lock } = useAdmin()
  const [showPin, setShowPin] = useState(false)

  return (
    <>
      <div style={{
        display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'13px 20px 11px',borderBottom:'1px solid var(--border)',
        background:'var(--bg)',position:'sticky',top:0,zIndex:50
      }}>
        {/* Logo kiri */}
        <div style={{display:'flex',alignItems:'center',gap:9}}>
          <div style={{
            width:32,height:32,background:'var(--accent)',borderRadius:9,
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:17
          }}>👟</div>
          <div style={{display:'flex',flexDirection:'column'}}>
            <span style={{fontSize:16,fontWeight:800,letterSpacing:'-.3px',lineHeight:1.1}}>Staffora Pro</span>
            <span style={{fontSize:9,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.07em'}}>
              Shoecare Management
            </span>
          </div>
        </div>

        {/* Tombol admin kanan */}
        <button onClick={() => isAdmin ? lock() : setShowPin(true)}
          style={{
            fontSize:11,padding:'4px 12px',borderRadius:20,cursor:'pointer',
            fontFamily:'inherit',fontWeight:600,transition:'all .2s',
            background: isAdmin ? 'var(--greenbg)' : 'var(--redbg)',
            color:       isAdmin ? 'var(--green)'   : 'var(--red)',
            border:      isAdmin ? '1px solid var(--greenborder)' : '1px solid var(--red)'
          }}>
          {isAdmin ? '✓ Admin' : '🔒 Kunci'}
        </button>
      </div>

      {showPin && <PinLock onSuccess={() => setShowPin(false)} onCancel={() => setShowPin(false)}/>}
    </>
  )
}