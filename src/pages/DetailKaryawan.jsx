import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getKaryawanById, getAbsensiBulan, getGaji,
        getJabatan, updateKaryawan, rupiah, getPengaturan } from '../api'

const COLORS  = ['#3b82f6','#22c55e','#f59e0b','#a78bfa','#ef4444','#14b8a6']
const HARI    = ['Sen','Sel','Rab','Kam','Jum','Sab','Min']
const BULAN_ID= ['Januari','Februari','Maret','April','Mei','Juni',
                'Juli','Agustus','September','Oktober','November','Desember']
const inisial = n => n.split(' ').slice(0,2).map(w=>w[0]).join('')

// Hitung selisih menit antara dua string jam "HH:MM"
function selisihMenit(jamMasuk, batasJam) {
 if (!jamMasuk || !batasJam) return 0
 const [h1,m1] = jamMasuk.split(':').map(Number)
 const [h2,m2] = batasJam.split(':').map(Number)
 return (h1*60+m1) - (h2*60+m2)
}

export default function DetailKaryawan() {
 const { id }   = useParams()
 const navigate = useNavigate()
 const now      = new Date()
 const bulan    = now.getMonth() + 1
 const tahun    = now.getFullYear()

 const [k,         setK]         = useState(null)
 const [absen,     setAbsen]     = useState({ ringkasan:{hadir:0,sakit:0,izin:0,libur:0}, detail:[] })
 const [gaji,      setGaji]      = useState(null)
 const [jabList,   setJabList]   = useState([])
 const [cfg,       setCfg]       = useState({})
 const [shifts,    setShifts]    = useState([])
 const [editNama,  setEditNama]  = useState('')
 const [editJab,   setEditJab]   = useState('')
 const [editShift, setEditShift] = useState(0)
 const [jadwal,    setJadwal]    = useState([0,0,0,0,0,1,2])
 const [saved,     setSaved]     = useState(false)
 const [tab,       setTab]       = useState('ringkasan') 
 const [bulanRekap, setBulanRekap] = useState(bulan)
 const [tahunRekap, setTahunRekap] = useState(tahun)
 const [loadingRekap, setLoadingRekap] = useState(false)
 const [rekapData,    setRekapData]    = useState(null)

 useEffect(() => { loadAll() }, [id])

 async function loadAll() {
   // Ambil data pengaturan dan list shift dari backend via api
   const [kRes, aRes, gRes, jRes, cfgRes] = await Promise.all([
     getKaryawanById(id),
     getAbsensiBulan(id, bulan, tahun),
     getGaji(id, bulan, tahun),
     getJabatan(),
     getPengaturan(),
   ])
   
   setK(kRes.data)
   setAbsen(aRes.data)
   setGaji(gRes.data)
   setJabList(jRes.data)
   setCfg(cfgRes.data)
   // Menyimpan master shifts dari data pengaturan/api jika tersedia
   if (cfgRes.data?.shifts) {
     setShifts(cfgRes.data.shifts)
   } else {
     // Fallback jika API terpisah, Anda bisa menyesuaikan atau mengambil data shift di sini
     setShifts(cfgRes.data?.master_shifts || [])
   }
   
   setEditNama(kRes.data.nama)
   setEditJab(kRes.data.jabatan_id)
   setEditShift(kRes.data.shift_id)
   setJadwal(kRes.data.jadwal_mingguan || [0,0,0,0,0,1,2])
   loadRekap(bulan, tahun, aRes.data)
 }

 async function loadRekap(b, t, absenDataOverride) {
   setLoadingRekap(true)
   try {
     let data = absenDataOverride
     if (!data) {
       const r = await getAbsensiBulan(id, b, t)
       data = r?.data || { ringkasan:{hadir:0,sakit:0,izin:0,libur:0}, detail:[] }
     }
     setRekapData(data)
   } catch(e) {
     console.error(e)
   } finally {
     setLoadingRekap(false)
   }
 }

 async function gantiBulanRekap(b, t) {
   setBulanRekap(b)
   setTahunRekap(t)
   await loadRekap(b, t, null)
 }

 async function simpan() {
   await updateKaryawan(id, {
     nama: editNama, jabatan_id: editJab,
     shift_id: editShift, jadwal_mingguan: jadwal
   })
   setSaved(true)
   setTimeout(() => setSaved(false), 2000)
   loadAll()
 }

 const cycleJadwal = i => {
   const j = [...jadwal]; j[i] = (j[i]+1)%4;
   setJadwal(j)
 }

 if (!k) return <div style={{padding:40,textAlign:'center',color:'var(--text3)'}}>Memuat...</div>

 // Ambil data shift hari ini secara dinamis berdasarkan jadwal mingguan
 const hariIniIndex = (now.getDay() === 0) ? 6 : now.getDay() - 1 // 0: Sen, 6: Min
 const shiftHariIniIdx = jadwal[hariIniIndex] 
 const listShiftsMaster = cfg.shifts || []
 const activeShiftHariIni = listShiftsMaster[shiftHariIniIdx]

 const ring     = absen.ringkasan
 const total    = ring.hadir+ring.sakit+ring.izin+ring.libur
 const hadirPct = total > 0 ? Math.round(ring.hadir/total*100) : 0

 const toleransi   = parseInt(cfg.toleransi_telat) || 15
 const defaultJamIn = "07:00"

 // Fungsi pembantu untuk mencari jam masuk terikat jadwal shift hari tertentu
 function getBatasJamMasukByTanggal(tglStr) {
   if (!tglStr || listShiftsMaster.length === 0) return defaultJamIn
   const d = new Date(tglStr)
   const idxHari = (d.getDay() === 0) ? 6 : d.getDay() - 1
   const idxShift = jadwal[idxHari]
   if (idxShift === 3 || !listShiftsMaster[idxShift]) return defaultJamIn // Libur / tidak ditemukan
   return listShiftsMaster[idxShift].jam_masuk || defaultJamIn
 }

 const detailList = (rekapData?.detail || []).sort((a,b) => a.tanggal > b.tanggal ? 1 : -1)

 let telat = 0, totalMenitTelat = 0
 detailList.forEach(d => {
   if (d.jam_masuk && d.status === 'hadir') {
     const batasJamInTanggal = getBatasJamMasukByTanggal(d.tanggal)
     const selisih = selisihMenit(d.jam_masuk, batasJamInTanggal)
     if (selisih > toleransi) {
       telat++
       totalMenitTelat += selisih
     }
   }
 })

 function fmtTgl(tglStr) {
   if (!tglStr) return '-'
   const d = new Date(tglStr)
   const hari = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'][d.getDay()]
   return `${hari}, ${d.getDate()} ${BULAN_ID[d.getMonth()].slice(0,3)}`
 }

 function statusStyle(s) {
   return {
     hadir:  { color:'var(--green)',  bg:'var(--greenbg)',  label:'Hadir' },
     sakit:  { color:'var(--red)',    bg:'var(--redbg)',    label:'Sakit' },
     izin:   { color:'var(--amber)',  bg:'var(--amberbg)',  label:'Izin'  },
     libur:  { color:'var(--text3)', bg:'var(--bg3)',      label:'Libur' },
   }[s] || { color:'var(--text3)', bg:'var(--bg3)', label:'-' }
 }

 const bulanOpts = []
 for (let i = 0; i < 6; i++) {
   const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
   bulanOpts.push({ b: d.getMonth()+1, t: d.getFullYear(), label: BULAN_ID[d.getMonth()]+' '+d.getFullYear() })
 }

 // ── HITUNG RINCIAN POTONGAN ABSEN (REVISI SLIP GAJI) ─────────────────
 const potongPerHari = parseInt(cfg.potong_absen) || 50000
 const totalHariMangkir = (ring.sakit || 0) + (ring.izin || 0)
 const totalPotonganAbsen = totalHariMangkir * potongPerHari
 
 // Ambil variabel kalkulasi dari backend, gabung dengan potongan absen dinamis
 const gajiPokokBersih = gaji?.rincian?.gaji_pokok || 0
 const tunjanganJabatan = gaji?.rincian?.tunjangan || 0
 const bonusPasang      = gaji?.rincian?.bonus_pasang || 0
 const bonusManual      = gaji?.rincian?.bonus_manual || 0
 const potonganSistem   = gaji?.total_potongan || 0
 
 // Total akumulasi potongan seluruhnya
 const akumulasiPotongan = potonganSistem + totalPotonganAbsen
 const totalGajiBersihAkhir = (gajiPokokBersih + tunjanganJabatan + bonusPasang + bonusManual) - akumulasiPotongan

 return (
   <div>
     <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px 12px',borderBottom:'1px solid var(--border)',position:'sticky',top:0,background:'var(--bg)',zIndex:50}}>
       <button onClick={() => navigate('/dashboard')} style={{display:'flex',alignItems:'center',gap:6,background:'none',border:'none',color:'var(--text2)',cursor:'pointer',fontSize:14,fontWeight:600,fontFamily:'inherit'}}>
         ← Kembali
       </button>
       <div style={{fontSize:11,background:'var(--accentbg,#1e2d4a)',color:'var(--accent)',padding:'3px 10px',borderRadius:20}}>Admin</div>
     </div>

     <div style={{padding:'20px 20px 14px',textAlign:'center',borderBottom:'1px solid var(--border)'}}>
       {k.foto_url
         ? <img src={k.foto_url} alt={k.nama} style={{width:72,height:72,borderRadius:'50%',objectFit:'cover',margin:'0 auto 10px',display:'block',border:'3px solid var(--accent)'}}/>
         : <div style={{width:72,height:72,borderRadius:'50%',background:COLORS[0],margin:'0 auto 10px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:700,color:'#fff'}}>
             {inisial(k.nama)}
           </div>
       }
       <div style={{fontSize:19,fontWeight:800}}>{k.nama}</div>
       <div style={{fontSize:12,color:'var(--text3)',marginTop:2}}>
         {k.jabatan?.nama} · {shiftHariIniIdx === 3 ? 'Libur' : (activeShiftHariIni?.nama || 'Shift Kerja')}
       </div>
       <div style={{fontSize:11,color:'var(--text3)',marginTop:4}}>
         Jadwal Hari Ini: {shiftHariIniIdx === 3 ? 'Bebas Tugas' : `${activeShiftHariIni?.jam_masuk || '--:--'} – ${activeShiftHariIni?.jam_keluar || '--:--'}`} · Toleransi telat {toleransi} mnt
       </div>
     </div>

     <div style={{display:'flex',borderBottom:'1px solid var(--border)',margin:'0 0 0'}}>
       {[{id:'ringkasan',label:'Ringkasan'},{id:'rekap',label:'Rekap Absen'}].map(t => (
         <button key={t.id} onClick={() => setTab(t.id)} style={{
           flex:1, padding:'12px 0', background:'none', border:'none',
           borderBottom: tab===t.id ? '2px solid var(--accent)' : '2px solid transparent',
           color: tab===t.id ? 'var(--accent)' : 'var(--text3)',
           fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
           marginBottom:-1, transition:'all .15s',
         }}>
           {t.label}
         </button>
       ))}
     </div>

     {tab === 'ringkasan' && (<>
       <p style={{fontSize:11,fontWeight:600,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.08em',padding:'14px 20px 6px'}}>
         Kehadiran — {now.toLocaleString('id-ID',{month:'long'})} {tahun}
       </p>
       <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:16,margin:'0 16px 10px'}}>
         <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:14}}>
           {[
             {l:'Hadir',v:ring.hadir,c:'var(--green)'},
             {l:'Sakit',v:ring.sakit,c:'var(--red)'},
             {l:'Izin',v:ring.izin,c:'var(--amber)'},
             {l:'Libur',v:ring.libur,c:'var(--text3)'},
           ].map(s => (
             <div key={s.l} style={{background:'var(--bg3)',borderRadius:'var(--radius-sm)',padding:'10px 6px',textAlign:'center'}}>
               <div style={{fontSize:22,fontWeight:800,color:s.c,fontFamily:'DM Mono,monospace'}}>{s.v}</div>
               <div style={{fontSize:10,color:'var(--text3)',marginTop:4}}>{s.l}</div>
             </div>
           ))}
         </div>

         <div style={{background:'var(--bg3)',borderRadius:'var(--radius-sm)',padding:'10px 12px',marginBottom:12}}>
           <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
             <span style={{fontSize:12,color:'var(--text2)'}}>Keterlambatan bulan ini</span>
             <span style={{fontSize:13,fontWeight:700,color:telat>0?'var(--red)':'var(--green)',fontFamily:'DM Mono,monospace'}}>{telat}×</span>
           </div>
           {telat > 0 && (
             <div style={{fontSize:11,color:'var(--text3)'}}>
               Total terlambat: ~{Math.round(totalMenitTelat/telat)} menit rata-rata per kejadian
             </div>
           )}
         </div>

         <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
           <div style={{fontSize:11,color:'var(--text3)'}}>Tingkat kehadiran</div>
           <div style={{fontSize:11,fontWeight:700,color:hadirPct>=85?'var(--green)':hadirPct>=70?'var(--amber)':'var(--red)'}}>{hadirPct}%</div>
         </div>
         <div style={{height:6,background:'var(--bg4,#252d3d)',borderRadius:3,overflow:'hidden'}}>
           <div style={{height:'100%',borderRadius:3,transition:'width .4s',width:hadirPct+'%',background:hadirPct>=85?'var(--green)':hadirPct>=70?'var(--amber)':'var(--red)'}}/>
         </div>
       </div>

       <p style={{fontSize:11,fontWeight:600,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.08em',padding:'14px 20px 6px'}}>Slip Gaji Bulan Ini</p>
       {gaji && (
         <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:16,margin:'0 16px 10px'}}>
           {[
             {l:'Gaji pokok',      v:rupiah(gajiPokokBersih),   c:''},
             {l:'Tunjangan jabatan',v:'+'+rupiah(tunjanganJabatan),  c:'var(--green)'},
             {l:'Bonus pasang',    v:'+'+rupiah(bonusPasang),c:'var(--green)'},
             {l:'Bonus manual',    v:'+'+rupiah(bonusManual),c:'var(--green)'},
             {l:`Potongan Absen (${totalHariMangkir} hari)`, v:totalPotonganAbsen > 0 ? '-'+rupiah(totalPotonganAbsen) : '—', c:totalPotonganAbsen > 0 ? 'var(--red)' : ''},
             {l:'Potongan Lain-lain', v:potonganSistem > 0 ? '-'+rupiah(potonganSistem) : '—', c:potonganSistem > 0 ? 'var(--red)' : ''},
           ].map((r,i) => (
             <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)',fontSize:13}}>
               <span style={{color:'var(--text2)'}}>{r.l}</span>
               <span style={{fontWeight:600,fontFamily:'DM Mono,monospace',color:r.c||'var(--text)'}}>{r.v}</span>
             </div>
           ))}
           <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:12,background:'var(--accentbg,#1e2d4a)',borderRadius:'var(--radius-sm)',padding:13,border:'1px solid var(--accent2,#1d4ed8)'}}>
             <div style={{fontSize:12,color:'var(--accent)'}}>Total Diterima</div>
             <div style={{fontSize:20,fontWeight:700,fontFamily:'DM Mono,monospace',color:'var(--accent)'}}>{rupiah(totalGajiBersihAkhir > 0 ? totalGajiBersihAkhir : 0)}</div>
           </div>
         </div>
       )}

       <p style={{fontSize:11,fontWeight:600,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.08em',padding:'14px 20px 6px'}}>Edit Data Karyawan</p>
       <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:16,margin:'0 16px 10px'}}>
         {[
           {l:'Nama lengkap', el:<input value={editNama} onChange={e=>setEditNama(e.target.value)} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',color:'var(--text)',fontSize:13,padding:'8px 12px',width:'100%',fontFamily:'inherit',outline:'none',marginTop:4}}/>},
           {l:'Jabatan',      el:<select value={editJab} onChange={e=>setEditJab(e.target.value)} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',color:'var(--text)',fontSize:13,padding:'8px 12px',width:'100%',fontFamily:'inherit',outline:'none',marginTop:4}}>{jabList.map(j=><option key={j.id} value={j.id}>{j.nama} — {rupiah(j.gaji_pokok)}</option>)}</select>},
         ].map(f => <div key={f.l}><div style={{fontSize:11,color:'var(--text3)',marginTop:10}}>{f.l}</div>{f.el}</div>)}
         <button onClick={simpan} style={{width:'100%',padding:12,background:saved?'var(--green)':'var(--accent)',color:'#fff',border:'none',borderRadius:'var(--radius-sm)',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginTop:14,transition:'background .2s'}}>
           {saved ? '✓ Tersimpan!' : 'Simpan Perubahan'}
         </button>
       </div>

      <p style={{fontSize:11,fontWeight:600,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.08em',padding:'14px 20px 6px'}}>Jadwal Shift Mingguan</p>
       <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:16,margin:'0 16px 24px'}}>
         <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4}}>
           {HARI.map((h,i) => {
             const v   = jadwal[i]
             const buttonCfg = [
               {bg:'var(--accentbg,#1e2d4a)', bc:'var(--accent)', c:'var(--accent)', l:'S1'},
               {bg:'var(--amberbg)', bc:'var(--amber)', c:'var(--amber)', l:'S2'},
               {bg:'rgba(167,139,250,0.15)', bc:'var(--purple,#a78bfa)', c:'var(--purple,#a78bfa)', l:'S3'}, 
               {bg:'var(--redbg)', bc:'var(--red)', c:'var(--red)', l:'L'}
             ][v] || {bg:'var(--bg3)', bc:'var(--border)', c:'var(--text3)', l:'-'}

             return (
               <div key={h} style={{textAlign:'center'}}>
                 <div style={{fontSize:9,color:'var(--text3)',fontWeight:600,marginBottom:4}}>{h}</div>
                 <button onClick={() => cycleJadwal(i)} style={{width:34,height:34,borderRadius:8,border:`1.5px solid ${buttonCfg.bc}`,background:buttonCfg.bg,color:buttonCfg.c,cursor:'pointer',fontSize:9,fontWeight:700,fontFamily:'inherit'}}>{buttonCfg.l}</button>
               </div>
             )
           })}
         </div>
         <div style={{display:'flex',gap:12,marginTop:10,flexWrap:'wrap'}}>
           {[
             {l:'Shift 1', c:'var(--accent)'},
             {l:'Shift 2', c:'var(--amber)'},
             {l:'Shift 3', c:'var(--purple,#a78bfa)'}, 
             {l:'Libur', c:'var(--red)'}
           ].map(x=>(
             <div key={x.l} style={{display:'flex',alignItems:'center',gap:5,fontSize:10,color:'var(--text3)'}}>
               <div style={{width:10,height:10,borderRadius:3,background:x.c}}/>{x.l}
             </div>
           ))}
         </div>
       </div>
     </>)}

     {tab === 'rekap' && (<>
       <div style={{padding:'14px 16px 8px',display:'flex',alignItems:'center',gap:10}}>
         <span style={{fontSize:11,color:'var(--text3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',flexShrink:0}}>Periode</span>
         <select
           value={`${bulanRekap}-${tahunRekap}`}
           onChange={e => {
             const [b,t] = e.target.value.split('-').map(Number)
             gantiBulanRekap(b, t)
           }}
           style={{flex:1,background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',color:'var(--text)',fontSize:13,padding:'7px 10px',fontFamily:'inherit',outline:'none'}}>
           {bulanOpts.map(o => (
             <option key={`${o.b}-${o.t}`} value={`${o.b}-${o.t}`}>{o.label}</option>
           ))}
         </select>
       </div>

       {rekapData && (
         <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,padding:'0 16px 10px'}}>
           {[
             {l:'Hadir', v:rekapData.ringkasan?.hadir||0,  c:'var(--green)'},
             {l:'Sakit', v:rekapData.ringkasan?.sakit||0,  c:'var(--red)'},
             {l:'Izin',  v:rekapData.ringkasan?.izin||0,   c:'var(--amber)'},
             {l:'Telat', v:telat,                          c:telat>0?'var(--red)':'var(--text3)'},
           ].map(s => (
             <div key={s.l} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'8px 4px',textAlign:'center'}}>
               <div style={{fontSize:18,fontWeight:800,color:s.c,fontFamily:'DM Mono,monospace'}}>{s.v}</div>
               <div style={{fontSize:9,color:'var(--text3)',marginTop:3}}>{s.l}</div>
             </div>
           ))}
         </div>
       )}

       <div style={{display:'grid',gridTemplateColumns:'90px 1fr 1fr 60px',gap:6,padding:'4px 16px 6px',borderBottom:'1px solid var(--border)'}}>
         {['Tanggal','Masuk','Keluar','Status'].map(h => (
           <div key={h} style={{fontSize:10,fontWeight:600,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.05em'}}>{h}</div>
         ))}
       </div>

       {loadingRekap && (
         <div style={{padding:'32px',textAlign:'center',color:'var(--text3)',fontSize:13}}>Memuat rekap...</div>
       )}

       {!loadingRekap && detailList.length === 0 && (
         <div style={{padding:'32px',textAlign:'center',color:'var(--text3)',fontSize:13}}>
           Tidak ada data absen untuk periode ini
         </div>
       )}

       {!loadingRekap && detailList.map((d, i) => {
         const ss       = statusStyle(d.status)
         const batasJamInTanggal = getBatasJamMasukByTanggal(d.tanggal)
         const selisih  = d.jam_masuk ? selisihMenit(d.jam_masuk, batasJamInTanggal) : 0
         const isTelat  = d.status === 'hadir' && selisih > toleransi

         return (
           <div key={i} style={{
             display:         'grid',
             gridTemplateColumns: '90px 1fr 1fr 60px',
             gap:             6,
             padding:         '10px 16px',
             borderBottom:    '1px solid var(--border)',
             alignItems:      'center',
             background:      isTelat ? 'rgba(239,68,68,0.04)' : 'transparent',
           }}>
             <div>
               <div style={{fontSize:12,fontWeight:600,color:'var(--text)'}}>{fmtTgl(d.tanggal)}</div>
               {isTelat && (
                 <div style={{fontSize:9,color:'var(--red)',fontWeight:700,marginTop:2}}>
                   ⚠ +{selisih - toleransi} mnt
                 </div>
               )}
             </div>

             <div style={{display:'flex',flexDirection:'column',gap:2}}>
               <span style={{
                 fontSize:     13,
                 fontWeight:   700,
                 fontFamily:   'DM Mono,monospace',
                 color:        d.jam_masuk ? (isTelat ? 'var(--red)' : 'var(--green)') : 'var(--text3)',
               }}>
                 {d.jam_masuk || '—'}
               </span>
               {isTelat && (
                 <span style={{fontSize:9,color:'var(--text3)'}}>
                   batas {batasJamInTanggal}
                 </span>
               )}
             </div>

             <div style={{
               fontSize:   13,
               fontWeight: 700,
               fontFamily: 'DM Mono,monospace',
               color:      d.jam_keluar ? 'var(--text2)' : 'var(--text3)',
             }}>
               {d.jam_keluar || '—'}
             </div>

             <div style={{
               fontSize:     10,
               fontWeight:   700,
               padding:      '3px 8px',
               borderRadius: 20,
               background:   ss.bg,
               color:        ss.color,
               textAlign:    'center',
               whiteSpace:   'nowrap',
             }}>
               {ss.label}
             </div>
           </div>
         )
       })}

       {!loadingRekap && telat > 0 && (
         <div style={{margin:'12px 16px 24px',background:'var(--redbg)',border:'1px solid var(--red)',borderRadius:'var(--radius)',padding:'12px 14px'}}>
           <div style={{fontSize:12,fontWeight:700,color:'var(--red)',marginBottom:6}}>
             ⚠️ Ringkasan Keterlambatan — {BULAN_ID[bulanRekap-1]} {tahunRekap}
           </div>
           <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
             <div style={{background:'rgba(239,68,68,0.1)',borderRadius:'var(--radius-sm)',padding:'8px 10px'}}>
               <div style={{fontSize:11,color:'var(--text3)',marginBottom:2}}>Jumlah kejadian</div>
               <div style={{fontSize:18,fontWeight:800,color:'var(--red)',fontFamily:'DM Mono,monospace'}}>{telat}×</div>
             </div>
             <div style={{background:'rgba(239,68,68,0.1)',borderRadius:'var(--radius-sm)',padding:'8px 10px'}}>
               <div style={{fontSize:11,color:'var(--text3)',marginBottom:2}}>Rata-rata terlambat</div>
               <div style={{fontSize:18,fontWeight:800,color:'var(--red)',fontFamily:'DM Mono,monospace'}}>{Math.round(totalMenitTelat/telat)} mnt</div>
             </div>
           </div>
         </div>
       )}

       {!loadingRekap && detailList.length > 0 && telat === 0 && (
         <div style={{margin:'12px 16px 24px',background:'var(--greenbg)',border:'1px solid var(--greenborder,#1a4429)',borderRadius:'var(--radius)',padding:'12px 14px',display:'flex',alignItems:'center',gap:10}}>
           <span style={{fontSize:20}}>🎉</span>
           <div>
             <div style={{fontSize:12,fontWeight:700,color:'var(--green)'}}>Tidak ada keterlambatan!</div>
             <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{BULAN_ID[bulanRekap-1]} {tahunRekap} — disiplin penuh</div>
           </div>
         </div>
       )}
     </>)}
   </div>
 )
}