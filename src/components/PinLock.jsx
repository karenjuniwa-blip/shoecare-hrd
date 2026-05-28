import { useState } from 'react'
import { useAdmin } from '../hooks/useAdmin'

export default function PinLock({ onSuccess, onCancel }) {
  const { unlock } = useAdmin()
  const [val, setVal]   = useState('')
  const [err, setErr]   = useState(false)

  function press(n) {
    if (val.length >= 4) return
    const next = val + n
    setVal(next)
    if (next.length === 4) setTimeout(() => check(next), 120)
  }

  function check(v) {
    if (unlock(v)) { onSuccess?.() }
    else {
      setErr(true)
      setTimeout(() => { setVal(''); setErr(false) }, 700)
    }
  }

  const overlay = {
    position:'fixed',inset:0,background:'rgba(0,0,0,.85)',
    zIndex:400,display:'flex',alignItems:'center',
    justifyContent:'center',backdropFilter:'blur(4px)'
  }
  const box = {
    background:'var(--bg2)',border:'1px solid var(--border)',
    borderRadius:20,padding:'28px 24px',
    width:'calc(100% - 48px)',maxWidth:300,textAlign:'center'
  }

  return (
    <div style={overlay}>
      <div style={box}>
        <div style={{fontSize:36,marginBottom:12}}>🔑</div>
        <div style={{fontSize:17,fontWeight:800,marginBottom:4}}>PIN Admin</div>
        <div style={{fontSize:12,color:'var(--text3)',marginBottom:20}}>
          Dashboard dikunci untuk melindungi data karyawan
        </div>

        {/* Dots */}
        <div style={{display:'flex',justifyContent:'center',gap:12,marginBottom:20}}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width:14,height:14,borderRadius:'50%',
              background: i < val.length
                ? (err ? 'var(--red)' : 'var(--accent)')
                : 'var(--bg3)',
              border: `2px solid ${i < val.length ? (err?'var(--red)':'var(--accent)') : 'var(--border2)'}`,
              transition:'all .15s'
            }}/>
          ))}
        </div>

        {/* Numpad */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:12}}>
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k,i) => (
            <button key={i}
              onClick={() => k === '⌫' ? setVal(v=>v.slice(0,-1)) : k && press(k)}
              style={{
                background: k ? 'var(--bg3)' : 'transparent',
                border: k ? '1px solid var(--border)' : 'none',
                borderRadius:'var(--radius)',padding:14,
                fontSize: k==='⌫' ? 16 : 20,fontWeight:600,
                cursor: k ? 'pointer' : 'default',
                color:'var(--text)',fontFamily:'DM Mono,monospace',
                visibility: k==='' ? 'hidden' : 'visible'
              }}>{k}</button>
          ))}
        </div>
        <button onClick={onCancel}
          style={{fontSize:12,color:'var(--text3)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
          Batal
        </button>
      </div>
    </div>
  )
}