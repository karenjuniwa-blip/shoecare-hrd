// src/components/SplashScreen.jsx
// Letakkan file ini di: frontend/src/components/SplashScreen.jsx

import { useEffect, useState } from 'react'

export default function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState('enter')  // enter → show → exit
  const [dotActive, setDotActive] = useState(0)

  useEffect(() => {
    // Animasi dot loading
    const dotTimer = setInterval(() => {
      setDotActive(d => (d + 1) % 3)
    }, 400)

    // Fase: enter (0.8s) → show (1.5s) → exit (0.6s) → selesai
    const t1 = setTimeout(() => setPhase('show'),  800)
    const t2 = setTimeout(() => setPhase('exit'),  2800)
    const t3 = setTimeout(() => onFinish?.(),      3400)

    return () => {
      clearInterval(dotTimer)
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  const containerStyle = {
    position:       'fixed',
    inset:          0,
    zIndex:         9999,
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    background:     'linear-gradient(160deg, #0a0d14 0%, #0f1117 50%, #131929 100%)',
    overflow:       'hidden',
    // Animasi fade out saat exit
    opacity:        phase === 'exit' ? 0 : 1,
    transition:     phase === 'exit' ? 'opacity 0.6s ease' : 'none',
  }

  const glowStyle = {
    position:     'absolute',
    width:        400,
    height:       400,
    borderRadius: '50%',
    background:   'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)',
    top:          '30%',
    left:         '50%',
    transform:    'translateX(-50%) translateY(-50%)',
    filter:       'blur(40px)',
  }

  const iconBoxStyle = {
    width:        160,
    height:       160,
    borderRadius: 36,
    background:   'linear-gradient(145deg, #2563eb, #3b82f6)',
    display:      'flex',
    alignItems:   'center',
    justifyContent: 'center',
    marginBottom: 32,
    boxShadow:    '0 20px 60px rgba(37,99,235,0.45), 0 4px 20px rgba(37,99,235,0.3)',
    // Animasi muncul
    transform:    phase === 'enter' ? 'scale(0.7) translateY(20px)' : 'scale(1) translateY(0)',
    opacity:      phase === 'enter' ? 0 : 1,
    transition:   'transform 0.7s cubic-bezier(0.34,1.56,0.64,1), opacity 0.5s ease',
  }

  const titleWrapStyle = {
    display:     'flex',
    alignItems:  'center',
    gap:         10,
    marginBottom: 12,
    transform:   phase === 'enter' ? 'translateY(16px)' : 'translateY(0)',
    opacity:     phase === 'enter' ? 0 : 1,
    transition:  'transform 0.6s ease 0.2s, opacity 0.5s ease 0.2s',
  }

  const taglineStyle = {
    transform:   phase === 'enter' ? 'translateY(12px)' : 'translateY(0)',
    opacity:     phase === 'enter' ? 0 : 0.5,
    transition:  'transform 0.6s ease 0.35s, opacity 0.5s ease 0.35s',
  }

  const dotsStyle = {
    display:      'flex',
    gap:          10,
    marginTop:    48,
    transform:    phase === 'enter' ? 'translateY(8px)' : 'translateY(0)',
    opacity:      phase === 'enter' ? 0 : 1,
    transition:   'transform 0.5s ease 0.5s, opacity 0.5s ease 0.5s',
  }

  return (
    <div style={containerStyle}>
      {/* Glow background */}
      <div style={glowStyle} />

      {/* Dekoratif lingkaran sudut */}
      <div style={{position:'absolute',top:-100,right:-80,width:300,height:300,borderRadius:'50%',background:'rgba(37,99,235,0.06)',filter:'blur(30px)'}}/>
      <div style={{position:'absolute',bottom:-80,left:-60,width:250,height:250,borderRadius:'50%',background:'rgba(59,130,246,0.08)',filter:'blur(30px)'}}/>

      {/* Icon box */}
      <div style={iconBoxStyle}>
        <svg width="90" height="90" viewBox="0 0 100 100" fill="none">
          {/* Kepala */}
          <circle cx="42" cy="28" r="16" fill="white"/>
          {/* Badan */}
          <ellipse cx="42" cy="68" rx="26" ry="22" fill="white"/>
          {/* Tas kerja */}
          <rect x="54" y="52" width="30" height="24" rx="4" fill="white"/>
          <rect x="54" y="63" width="30" height="3" fill="#2563eb"/>
          <rect x="61" y="47" width="16" height="8" rx="3" fill="white"/>
          <rect x="64" y="50" width="10" height="5" rx="2" fill="#2563eb"/>
          <circle cx="69" cy="64" r="3" fill="#2563eb"/>
        </svg>
      </div>

      {/* Nama aplikasi */}
      <div style={titleWrapStyle}>
        <span style={{
          fontSize:   38,
          fontWeight: 800,
          color:      'white',
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          letterSpacing: -1,
        }}>
          Staffora
        </span>
        <span style={{
          fontSize:     13,
          fontWeight:   700,
          background:   '#2563eb',
          color:        'white',
          padding:      '4px 10px',
          borderRadius: 8,
          letterSpacing: 1,
          marginTop:    4,
          fontFamily:   'system-ui',
        }}>
          PRO
        </span>
      </div>

      {/* Garis dekoratif + tagline */}
      <div style={taglineStyle}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:40,height:1.5,background:'#3b82f6',opacity:0.6}}/>
          <span style={{
            fontSize:   13,
            color:      '#94a3b8',
            fontWeight: 500,
            letterSpacing: 3,
            fontFamily: 'system-ui',
          }}>
            SMART HR SYSTEM
          </span>
          <div style={{width:40,height:1.5,background:'#3b82f6',opacity:0.6}}/>
        </div>
      </div>

      {/* Loading dots */}
      <div style={dotsStyle}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width:        dotActive === i ? 10 : 8,
            height:       dotActive === i ? 10 : 8,
            borderRadius: '50%',
            background:   dotActive === i ? '#3b82f6' : '#2a3347',
            transition:   'all 0.3s ease',
            marginTop:    dotActive === i ? 0 : 1,
          }}/>
        ))}
      </div>

      {/* Versi */}
      <div style={{
        position:   'absolute',
        bottom:     40,
        fontSize:   11,
        color:      '#374151',
        fontFamily: 'system-ui',
        letterSpacing: 1,
      }}>
        v1.0.0
      </div>
    </div>
  )
}
