import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom' 
import { getPengaturan, savePengaturan,
        getJabatan, createJabatan, updateJabatan, deleteJabatan,
        getShift, createShift, updateShift, deleteShift,
        rupiah } from '../api'
import { useAdmin } from '../hooks/useAdmin'
import PinLock from '../components/PinLock'

function Accordion({ title, sub, children }) {
 const [open, setOpen] = useState(false)
 return (
   <div style={{ margin: '0 16px 10px' }}>
     <div
       onClick={() => setOpen(!open)}
       style={{
         background:        open ? 'var(--bg3)' : 'var(--bg2)',
         border:            '1px solid var(--border)',
         borderRadius:      open ? '12px 12px 0 0' : '12px',
         borderBottomColor: open ? 'transparent' : 'var(--border)',
         padding:           '14px 16px',
         display:           'flex',
         alignItems:        'center',
         justifyContent:    'space-between',
         cursor:            'pointer',
         userSelect:        'none',
       }}>
       <div>
         <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
         {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>}
       </div>
       <span style={{
         color: 'var(--text3)', fontSize: 16,
         transition: 'transform .2s', display: 'inline-block',
         transform: open ? 'rotate(180deg)' : 'none',
       }}>▾</span>
     </div>
     {open && (
       <div style={{
         background:   'var(--bg2)',
         border:       '1px solid var(--border)',
         borderTop:    'none',
         borderRadius: '0 0 12px 12px',
         padding:      '14px 16px',
       }}>
         {children}
       </div>
     )}
   </div>
 )
}

const SRow = ({ label, sub, children }) => (
 <div style={{
   display:        'flex',
   alignItems:     'center',
   justifyContent: 'space-between',
   padding:        '10px 0',
   borderBottom:   '1px solid var(--border)',
 }}>
   <div>
     <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
     {sub && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>}
   </div>
   {children}
 </div>
)

const SInput = ({ style, ...props }) => (
 <input
   {...props}
   style={{
     background:  'var(--bg3)',
     border:      '1px solid var(--border)',
     borderRadius: 8,
     color:       'var(--text)',
     fontSize:    12,
     padding:     '5px 8px',
     width:       84,
     textAlign:   'right',
     fontFamily:  'DM Mono,monospace',
     outline:     'none',
     ...style,
   }}
 />
)

const SHIFT_COLORS = ['#3b82f6', '#f59e0b', '#a78bfa']

export default function Pengaturan() {
 const navigate = useNavigate() 
 const { changePin, isAdmin } = useAdmin() 
 const [showPin, setShowPin] = useState(!isAdmin)

 const [cfg,     setCfg]    = useState({})
 const [saved,   setSaved]  = useState(false)
 const [jabatan, setJabatan] = useState([])

 const [shifts,     setShifts]     = useState([])
 const [shiftErr,   setShiftErr]   = useState('')
 const [shiftSaved, setShiftSaved] = useState(false)
 const [shiftEdit, setShiftEdit]   = useState({})

 const [pinLama,    setPinLama]    = useState('')
 const [pinBaru,    setPinBaru]    = useState('')
 const [pinKonfirm, setPinKonfirm] = useState('')
 const [pinMsg,     setPinMsg]     = useState('')

 if (showPin) {
   return (
     <>
       <div style={{ textAlign:'center', padding:'60px 20px' }}>
         <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
         <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>Halaman Terkunci</div>
         <div style={{ fontSize:13, color:'var(--text3)', marginBottom:24 }}>
           Masukkan PIN admin untuk mengakses menu pengaturan sistem
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

 useEffect(() => {
   if (!showPin) {
     getPengaturan().then(r => setCfg(r.data))
     getJabatan().then(r => setJabatan(r.data))
     loadShift()
   }
 }, [showPin])

 async function loadShift() {
   const r = await getShift()
   const list = Array.isArray(r.data) ? r.data : []
   setShifts(list)
   const buf = {}
   list.forEach(s => {
     buf[s.id] = { nama: s.nama, jam_masuk: s.jam_masuk, jam_keluar: s.jam_keluar }
   })
   setShiftEdit(buf)
 }

 const set = (k, v) => setCfg(p => ({ ...p, [k]: v }))

 async function simpanPengaturan() {
   // REVISI: Menyimpan seluruh relasi struktur shifts terbaru ke object config induk Supabase
   const updatedConfig = {
     ...cfg,
     shifts: shifts.map(s => ({
       id: s.id,
       nama: shiftEdit[s.id]?.nama || s.nama,
       jam_masuk: shiftEdit[s.id]?.jam_masuk || s.jam_masuk,
       jam_keluar: shiftEdit[s.id]?.jam_keluar || s.jam_keluar
     }))
   }
   await savePengaturan(updatedConfig)
   setSaved(true)
   setTimeout(() => setSaved(false), 2000)
 }

 function editShiftField(id, field, val) {
   setShiftEdit(p => ({ ...p, [id]: { ...p[id], [field]: val } }))
 }

 async function simpanShift(id) {
   setShiftErr('')
   try {
     await updateShift(id, shiftEdit[id])
     setShiftSaved(true)
     setTimeout(() => setShiftSaved(false), 2000)
     loadShift()
   } catch (e) {
     setShiftErr(e?.response?.data?.error || 'Gagal menyimpan shift')
   }
 }

 async function tambahShift() {
   setShiftErr('')
   if (shifts.length >= 3) {
     setShiftErr('Maksimal 3 shift')
     return
   }
   try {
     await createShift({ nama: `Shift ${shifts.length + 1}`, jam_masuk: '07:00', jam_keluar: '15:00' })
     loadShift()
   } catch (e) {
     setShiftErr(e?.response?.data?.error || 'Gagal menambah shift')
   }
 }

 async function hapusShift(id) {
   setShiftErr('')
   try {
     await deleteShift(id)
     loadShift()
   } catch (e) {
     setShiftErr(e?.response?.data?.error || 'Gagal menghapus shift')
   }
 }

 async function addJabatan() {
   await createJabatan({ nama: 'Jabatan Baru', gaji_pokok: 1500000, tunjangan: 100000 })
   getJabatan().then(r => setJabatan(r.data))
 }

 async function delJab(id) {
   await deleteJabatan(id)
   setJabatan(j => j.filter(x => x.id !== id))
 }

 async function updateJab(id, field, val) {
   const updated = jabatan.map(x => x.id === id ? { ...x, [field]: val } : x)
   setJabatan(updated)
   const target = updated.find(x => x.id === id)
   await updateJabatan(id, { nama: target.nama, gaji_pokok: target.gaji_pokok, tunjangan: target.tunjangan })
 }

 function handleGantiPin() {
   if (!pinLama)                { setPinMsg('Masukkan PIN saat ini'); return }
   if (pinBaru !== pinKonfirm)  { setPinMsg('Konfirmasi PIN tidak cocok'); return }
   if (pinBaru.length < 4)      { setPinMsg('PIN minimal 4 digit'); return }
   const ok = changePin(pinLama, pinBaru)
   if (ok) {
     setPinMsg('✓ PIN berhasil diubah!')
     setPinLama(''); setPinBaru(''); setPinKonfirm('')
   } else {
     setPinMsg('PIN saat ini salah!')
   }
 }

 return (
   <div>
     <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', padding: '14px 20px 6px' }}>
       Konfigurasi sistem
     </p>

     <Accordion title="🔐 Keamanan & PIN Admin" sub="Ganti PIN untuk buka Dashboard">
       <SRow label="PIN saat ini">
         <SInput type="password" value={pinLama} maxLength={6} onChange={e => setPinLama(e.target.value)} placeholder="••••" style={{ letterSpacing: 6, textAlign: 'center', fontSize: 18 }} />
       </SRow>
       <SRow label="PIN baru">
         <SInput type="password" value={pinBaru} maxLength={6} onChange={e => setPinBaru(e.target.value)} placeholder="••••" style={{ letterSpacing: 6, textAlign: 'center', fontSize: 18 }} />
       </SRow>
       <SRow label="Konfirmasi PIN baru">
         <SInput type="password" value={pinKonfirm} maxLength={6} onChange={e => setPinKonfirm(e.target.value)} placeholder="••••" style={{ letterSpacing: 6, textAlign: 'center', fontSize: 18 }} />
       </SRow>
       {pinMsg && <div style={{ fontSize: 12, marginTop: 8, color: pinMsg.startsWith('✓') ? 'var(--green)' : 'var(--red)' }}>{pinMsg}</div>}
       <button onClick={handleGantiPin} style={{ width: '100%', padding: 11, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 12 }}>Simpan PIN</button>
       <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10, background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: '9px 12px', lineHeight: 1.6 }}>
         💡 PIN default: <strong style={{ color: 'var(--text)', fontFamily: 'DM Mono,monospace' }}>1234</strong><br />
         PIN disimpan di perangkat — karyawan tidak bisa akses Dashboard tanpa PIN ini.
       </div>
     </Accordion>

     <Accordion title="🕐 Pengaturan Shift" sub={`${shifts.length}/3 shift aktif — jam masuk & keluar`}>
       {shiftErr && <div style={{ background: 'var(--redbg)', border: '1px solid var(--red)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--red)', marginBottom: 10 }}>⚠️ {shiftErr}</div>}
       {shifts.map((s, i) => {
         const buf = shiftEdit[s.id] || { nama: s.nama, jam_masuk: s.jam_masuk, jam_keluar: s.jam_keluar }
         return (
           <div key={s.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
               <div style={{ width: 10, height: 10, borderRadius: '50%', background: SHIFT_COLORS[i % SHIFT_COLORS.length], flexShrink: 0 }} />
               <input value={buf.nama} onChange={e => editShiftField(s.id, 'nama', e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text)', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', outline: 'none' }} />
               <button onClick={() => hapusShift(s.id)} title="Hapus shift" style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--redbg)', border: '1px solid var(--red)', color: 'var(--red)', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>×</button>
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
               <div>
                 <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>Jam masuk</div>
                 <input type="time" value={buf.jam_masuk} onChange={e => editShiftField(s.id, 'jam_masuk', e.target.value)} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 12, padding: '5px 8px', fontFamily: 'DM Mono,monospace', outline: 'none', width: '100%' }} />
               </div>
               <div>
                 <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>Jam keluar</div>
                 <input type="time" value={buf.jam_keluar} onChange={e => editShiftField(s.id, 'jam_keluar', e.target.value)} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 12, padding: '5px 8px', fontFamily: 'DM Mono,monospace', outline: 'none', width: '100%' }} />
               </div>
             </div>
             <button onClick={() => simpanShift(s.id)} style={{ width: '100%', padding: '7px 0', background: shiftSaved ? 'var(--green)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'background .2s' }}>{shiftSaved ? '✓ Tersimpan' : 'Simpan shift ini'}</button>
           </div>
         )
       })}
       {shifts.length < 3 && (
         <button onClick={tambahShift} style={{ width: '100%', padding: 9, background: 'var(--bg3)', border: '1.5px dashed var(--border2,#334060)', borderRadius: 'var(--radius-sm)', color: 'var(--text2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Tambah shift ({shifts.length}/3)</button>
       )}
     </Accordion>

     <Accordion title="💰 Siklus Gajian" sub="Tanggal tutup & proses gaji">
       <SRow label="Tanggal tutup gajian" sub="Gaji dihitung sampai tanggal ini"><SInput type="number" value={cfg.tgl_tutup_gajian || '25'} onChange={e => set('tgl_tutup_gajian', e.target.value)} /></SRow>
       <SRow label="Tanggal bayar gaji" sub="Karyawan terima gaji"><SInput type="number" value={cfg.tgl_bayar_gajian || '27'} onChange={e => set('tgl_bayar_gajian', e.target.value)} /></SRow>
     </Accordion>

     <Accordion title="⭐ Ketentuan Bonus Pasang" sub="Target, bonus, potongan">
       <SRow label="Target harian (pasang)"><SInput type="number" value={cfg.target_pasang || '5'} onChange={e => set('target_pasang', e.target.value)} /></SRow>
       <SRow label="Bonus per pasang di atas target"><SInput type="number" value={cfg.bonus_per_pasang || '5000'} onChange={e => set('bonus_per_pasang', e.target.value)} /></SRow>
       <SRow label="Potongan per pasang kurang" sub="0 = tidak dipotong"><SInput type="number" value={cfg.potong_per_pasang || '0'} onChange={e => set('potong_per_pasang', e.target.value)} /></SRow>
     </Accordion>

     <Accordion title="⏱ Potongan Kehadiran" sub="Absen & keterlambatan">
       <SRow label="Potongan absen tanpa izin" sub="Per hari"><SInput type="number" value={cfg.potong_absen || '50000'} onChange={e => set('potong_absen', e.target.value)} /></SRow>
       <SRow label="Toleransi keterlambatan (menit)"><SInput type="number" value={cfg.toleransi_telat || '15'} onChange={e => set('toleransi_telat', e.target.value)} /></SRow>
       <SRow label="Potongan per 30 menit telat"><SInput type="number" value={cfg.potong_telat || '10000'} onChange={e => set('potong_telat', e.target.value)} /></SRow>
     </Accordion>

     <Accordion title="🏷️ Jabatan, Gaji & Tunjangan" sub="Tambah, edit, hapus jabatan">
       <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 28px', gap: 6, marginBottom: 8 }}>
         {['Jabatan', 'Gaji', 'Tunjangan', ''].map(h => (<div key={h} style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textAlign: h ? 'right' : 'left' }}>{h}</div>))}
       </div>
       {jabatan.map(j => (
         <div key={j.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 28px', gap: 6, marginBottom: 6, alignItems: 'center' }}>
           <input defaultValue={j.nama} onBlur={e => updateJab(j.id, 'nama', e.target.value)} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 12, padding: '5px 8px', fontFamily: 'inherit', outline: 'none', width: '100%' }} />
           <SInput defaultValue={j.gaji_pokok} onBlur={e => updateJab(j.id, 'gaji_pokok', parseInt(e.target.value))} style={{ width: '100%' }} />
           <SInput defaultValue={j.tunjangan} onBlur={e => updateJab(j.id, 'tunjangan', parseInt(e.target.value))} style={{ width: '100%' }} />
           <button onClick={() => delJab(j.id)} style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--redbg)', border: '1px solid var(--red)', color: 'var(--red)', cursor: 'pointer', fontSize: 14 }}>×</button>
         </div>
       ))}
       <button onClick={addJabatan} style={{ width: '100%', padding: 9, background: 'var(--bg3)', border: '1.5px dashed var(--border2,#334060)', borderRadius: 'var(--radius-sm)', color: 'var(--text2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginTop: 8 }}>+ Tambah jabatan baru</button>
     </Accordion>

     <div style={{ padding: '4px 16px 24px' }}>
       <button onClick={simpanPengaturan} style={{ width: '100%', padding: 13, background: saved ? 'var(--green)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'background .2s' }}>{saved ? '✓ Tersimpan!' : 'Simpan Semua Pengaturan'}</button>
     </div>
   </div>
 )
}