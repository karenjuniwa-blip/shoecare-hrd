import { useState, useEffect } from 'react'
import { getKaryawan, getPasang, postPasang, getPengaturan, rupiah } from '../api'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '../hooks/useAdmin'
import PinLock from '../components/PinLock'

const COLORS  = ['#3b82f6','#22c55e','#f59e0b','#a78bfa','#ef4444','#14b8a6']
const HARI_S  = ['Sen','Sel','Rab','Kam','Jum','Sab','Min']
const BULAN   = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
const inisial = n => n.split(' ').slice(0,2).map(w=>w[0]).join('')
const toStr   = d => d.toISOString().split('T')[0]

export default function Pasang() {
  const today = new Date()
  const navigate = useNavigate() // 👈 FIX: Penempatan hooks rapi di atas
  const { isAdmin } = useAdmin() 
  const [showPin, setShowPin] = useState(!isAdmin)

  const [selDate,   setSelDate]   = useState(today)
  const [calMonth,  setCalMonth]  = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [karyawan,  setKaryawan]  = useState([])
  const [pasangMap, setPasangMap] = useState({}) 
  const [cfg,       setCfg]       = useState({ target_pasang:'5', bonus_per_pasang:'5000' })

  // ── FIX: LOGIKA GEMBOK PIN YANG BENAR UNTUK PASANG ──
  if (showPin) {
    return (
      <>
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
          <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>Halaman Terkunci</div>
          <div style={{ fontSize:13, color:'var(--text3)', marginBottom:24 }}>
            Masukkan PIN admin untuk mengakses menu input pasang harian
          </div>
          <button
            onClick={() => setShowPin(true)}
            style={{ padding:'13px 32px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'var(--radius)', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}
          >
            🔑 Masukkan PIN
          </button>
        </div>
        <PinLock
          onSuccess={() => setShowPin(false)}
          onCancel={() => navigate('/absen')}
        />
      </>
    )
  }

  // ── Jalankan load data hanya jika PIN aman ──
  useEffect(() => {
    if (!showPin) {
      getKaryawan().then(r => setKaryawan(r.data))
      getPengaturan().then(r => setCfg(r.data))
    }
  }, [showPin])

  useEffect(() => { 
    if (!showPin) {
      loadPasang() 
    }
  }, [selDate, showPin])

  async function loadPasang() {
    const r = await getPasang(toStr(selDate))
    const map = {}
    r.data.forEach(p => map[p.karyawan_id] = p)
    setPasangMap(map)
  }

  async function adj(karyawan_id, delta) {
    const cur = pasangMap[karyawan_id]?.jumlah_pasang || 0
    const next = Math.max(0, cur + delta)
    await postPasang({ karyawan_id, tanggal: toStr(selDate), jumlah_pasang: next })
    loadPasang()
  }

  const minDate = new Date(today); minDate.setDate(today.getDate()-30)
  const y = calMonth.getFullYear(), m = calMonth.getMonth()
  const firstDow = (new Date(y,m,1).getDay()+6)%7
  const daysInM  = new Date(y,m+1,0).getDate()
  const todayStr = toStr(today)
  const selStr   = toStr(selDate)

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 20px 4px'}}>
        <div style={{fontSize:20,fontWeight:700}}>Input Pasang</div>
        <div style={{fontSize:11,color:'var(--text3)'}}>Target: {cfg.target_pasang} pasang/hari</div>
      </div>

      {/* Kalender */}
      <div style={{padding:'0 16px',marginBottom:4}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <button onClick={() => setCalMonth(new Date(y,m-1,1))} style={{background:'var(--bg3)',border:'none',color:'var(--text2)',cursor:'pointer',fontSize:18,padding:'2px 10px',borderRadius:'var(--radius-sm)'}}>‹</button>
          <div style={{fontSize:14,fontWeight:700}}>{BULAN[m]} {y}</div>
          <button onClick={() => setCalMonth(new Date(y,m+1,1))} disabled={y===today.getFullYear()&&m===today.getMonth()} style={{background:'var(--bg3)',border:'none',color:'var(--text2)',cursor:'pointer',fontSize:18,padding:'2px 10px',borderRadius:'var(--radius-sm)',opacity:y===today.getFullYear()&&m===today.getMonth()?0.3:1}}>›</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
          {HARI_S.map(h => <div key={h} style={{textAlign:'center',fontSize:10,color:'var(--text3)',fontWeight:600,paddingBottom:4}}>{h}</div>)}
          {Array.from({length:firstDow}).map((_,i)=><div key={'e'+i}/>)}
          {Array.from({length:daysInM},(_,i)=>{
            const d    = new Date(y,m,i+1)
            const ds   = toStr(d)
            const isSel    = ds===selStr
            const isToday  = ds===todayStr
            const disabled = d>today||d<minDate
            return (
              <div key={i} onClick={()=>!disabled&&setSelDate(d)}
                style={{aspectRatio:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',borderRadius:8,cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.25:1,
                  background:isSel?'var(--accent)':isToday?'var(--accentbg,#1e2d4a)':'transparent',
                  border:`1.5px solid ${isSel?'var(--accent)':isToday?'var(--accent2,#1d4ed8)':'transparent'}`}}>
                <span style={{fontSize:12,fontWeight:600,color:isSel?'#fff':isToday?'var(--accent)':'var(--text)'}}>{i+1}</span>
              </div>
            )
          })}
        </div>
      </div>

      <p style={{fontSize:11,fontWeight:600,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.08em',padding:'14px 20px 6px'}}>
        Input pasang — {selDate.getDate()} {BULAN[selDate.getMonth()]} {selDate.getFullYear()}
      </p>

      {karyawan.map((k,i) => {
        const p   = pasangMap[k.id]?.jumlah_pasang || 0
        const bon = pasangMap[k.id]?.bonus_dihitung || 0
        const lebih = p - parseInt(cfg.target_pasang)
        return (
          <div key={k.id} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:13,margin:'0 16px 8px'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <div style={{width:32,height:32,borderRadius:'50%',background:COLORS[i%COLORS.length],display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#fff'}}>{inisial(k.nama)}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700}}>{k.nama}</div>
                <div style={{fontSize:10,color:'var(--text3)'}}>Target: {cfg.target_pasang} pasang</div>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,background:'var(--bg3)',borderRadius:'var(--radius-sm)',padding:'8px 12px',marginBottom:8}}>
              <div style={{fontSize:12,color:'var(--text2)',flex:1}}>Jumlah pasang hari ini</div>
              <button onClick={()=>adj(k.id,-1)} style={{width:28,height:28,borderRadius:6,border:'1px solid var(--border2,#334060)',background:'var(--bg4)',color:'var(--text)',cursor:'pointer',fontSize:16,fontWeight:600}}>−</button>
              <div style={{fontSize:16,fontWeight:700,fontFamily:'DM Mono,monospace',minWidth:28,textAlign:'center'}}>{p}</div>
              <button onClick={()=>adj(k.id,1)}  style={{width:28,height:28,borderRadius:6,border:'1px solid var(--border2,#334060)',background:'var(--bg4)',color:'var(--text)',cursor:'pointer',fontSize:16,fontWeight:600}}>+</button>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',background:'var(--bg3)',borderRadius:'var(--radius-sm)',padding:'7px 10px',fontSize:12}}>
              <span style={{color:'var(--text3)'}}>{lebih>0?`Bonus ${lebih} pasang ekstra`:lebih<0?`Kurang ${Math.abs(lebih)} dari target`:'Tepat target'}</span>
              <span style={{fontWeight:700,fontFamily:'DM Mono,monospace',color:bon>0?'var(--green)':bon<0?'var(--red)':'var(--text3)'}}>{bon>0?'+'+rupiah(bon):bon<0?'-'+rupiah(Math.abs(bon)):'Sesuai target'}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}