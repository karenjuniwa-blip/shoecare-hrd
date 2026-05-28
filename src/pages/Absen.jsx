import { useState, useEffect } from 'react'
import { getKaryawan, getAbsensi, postAbsensi } from '../api'

const COLORS = ['#3b82f6','#22c55e','#f59e0b','#a78bfa','#ef4444','#14b8a6']
const inisial = n => n.split(' ').slice(0,2).map(w=>w[0]).join('')
const todayStr = () => new Date().toISOString().split('T')[0]

export default function Absen() {
  const [karyawan, setKaryawan] = useState([])
  const [absenMap, setAbsenMap] = useState({})
  const [rawAbsen, setRawAbsen] = useState([]) // ← TAMBAH: Menyimpan data absensi mentah untuk riwayat
  const [selected, setSelected] = useState(null)
  const [popup,    setPopup]    = useState(null)
  const [jam,      setJam]      = useState('')
  const [error,    setError]    = useState(null)   
  const [loading,  setLoading]  = useState(true)   

  useEffect(() => {
    loadData()
    const t = setInterval(() => setJam(new Date().toTimeString().slice(0,8)), 1000)
    return () => clearInterval(t)
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      setError(null)

      const [k, a] = await Promise.all([
        getKaryawan(),
        getAbsensi(todayStr())
      ])

      const listKaryawan = Array.isArray(k.data) ? k.data : []
      const listAbsen    = Array.isArray(a.data) ? a.data : []

      setKaryawan(listKaryawan)
      setRawAbsen(listAbsen) // ← TAMBAH: Masukkan ke state rawAbsen

      const map = {}
      listAbsen.forEach(x => {
        if (x.karyawan_id) map[x.karyawan_id] = x.status
      })
      setAbsenMap(map)

    } catch (err) {
      console.error('loadData error:', err)
      setError(err?.response?.data?.error || err?.message || 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  async function doAbsen(type) {
    if (!selected) return
    const now = new Date().toTimeString().slice(0,5)

    try {
      await postAbsensi({
        karyawan_id: selected.id,
        tanggal:     todayStr(),
        status:      (type === 'masuk' || type === 'keluar') ? 'hadir' : type, // ← Fix Constraint kemarin
        jam_masuk:   type === 'masuk'  ? now : undefined,
        jam_keluar:  type === 'keluar' ? now : undefined,
      })

      const cfg = {
        masuk:  { icon:'✅', title:'Absen Masuk Berhasil!',  sub:'Selamat bekerja 💪',              warna:'var(--green)' },
        keluar: { icon:'👋', title:'Absen Keluar Berhasil!', sub:'Terima kasih sudah kerja keras!', warna:'var(--green)' },
        sakit:  { icon:'🤒', title:'Dicatat Sakit',          sub:'Semoga lekas sembuh!',             warna:'var(--red)'   },
        izin:   { icon:'📋', title:'Izin Disetujui',         sub:'Sudah tercatat admin.',            warna:'var(--amber)' },
      }

      setPopup({ ...cfg[type], jam: now, nama: selected.nama })
      setSelected(null)
      loadData() // ← Otomatis memperbarui grid dan riwayat aktivitas

    } catch (err) {
      console.error('doAbsen error:', err)
      alert('Gagal menyimpan absen: ' + (err?.response?.data?.error || err?.message))
    }
  }

  // ── LOGIKA TAMBAHAN: ME-MAP DATA ABSENSI MENJADI DAFTAR AKTIVITAS ──
  const aktifitas = []
  rawAbsen.forEach(x => {
    const k = karyawan.find(ky => ky.id === x.karyawan_id)
    const namaKaryawan = k ? k.nama : 'Karyawan'
    
    if (x.jam_masuk) {
      aktifitas.push({
        id: `${x.id}-masuk`,
        nama: namaKaryawan,
        text: 'absen masuk',
        icon: '↗️',
        jam: x.jam_masuk.slice(0,5)
      })
    }
    if (x.jam_keluar) {
      aktifitas.push({
        id: `${x.id}-keluar`,
        nama: namaKaryawan,
        text: 'absen keluar',
        icon: '↩️',
        jam: x.jam_keluar.slice(0,5)
      })
    }
  })
  // Urutkan aktivitas berdasarkan jam terbaru (paling atas)
  aktifitas.sort((a, b) => b.jam.localeCompare(a.jam))

  const st     = selected ? absenMap[selected.id] : null
  const locked = st === 'sakit' || st === 'izin'

  return (
    <div style={{ paddingBottom: 40 }}>
      
      {/* ── 1. LOGO & TULISAN HEADLINE (TEMPAT MENGGANTINYA) ── */}
      <div style={{ textAlign: 'center', paddingTop: 24, paddingBottom: 10 }}>
        
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>KICK SHOES YOGYAKARTA</div> {/* ← Ganti judul di sini */}
        <div style={{ fontSize: 8, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>
          Shoescare Management
        </div> {/* ← Ganti sub-judul di sini */}
      </div>
      {/* ────────────────────────────────────────────────────── */}

      {/* Header jam */}
      <div style={{ textAlign:'center', padding:'4px 20px 4px' }}>
        <div style={{ fontSize:38, fontWeight:700, fontFamily:'DM Mono,monospace', letterSpacing:-2 }}>
          {jam}
        </div>
        <div style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>
          {new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign:'center', padding:'32px 20px', color:'var(--text3)', fontSize:13 }}>
          Memuat data karyawan...
        </div>
      )}

      {!loading && error && (
        <div style={{ margin: '16px 16px 0', background: 'var(--redbg)', border: '1px solid var(--red)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--red)', marginBottom:6 }}>⚠️ Gagal memuat data</div>
          <div style={{ fontSize:12, color:'var(--text2)', marginBottom:12 }}>{error}</div>
          <button onClick={loadData} style={{ padding: '8px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            🔄 Coba lagi
          </button>
        </div>
      )}

      {!loading && !error && karyawan.length === 0 && (
        <div style={{ margin: '16px 16px 0', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '28px 16px', textAlign: 'center' }}>
          <div style={{ fontSize:28, marginBottom:10 }}>👥</div>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Belum ada karyawan</div>
        </div>
      )}

      {!loading && !error && karyawan.length > 0 && (
        <>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', padding: '14px 20px 6px' }}>
            Pilih karyawan
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '0 16px', marginBottom: 10 }}>
            {karyawan.map((k, i) => {
              const st         = absenMap[k.id]
              const isLocked   = st === 'sakit' || st === 'izin'
              const isSelected = selected?.id === k.id
              const spColor    = { hadir:'var(--green)', sakit:'var(--red)', izin:'var(--amber)' }[st] || 'var(--text3)'

              return (
                <div key={k.id} onClick={() => !isLocked && setSelected(isSelected ? null : k)}
                  style={{
                    background:   isSelected ? 'var(--accentbg,#1e2d4a)' : isLocked ? 'var(--bg3)' : 'var(--bg2)',
                    border:       `1.5px solid ${isSelected ? 'var(--accent)' : isLocked ? spColor : 'var(--border)'}`,
                    borderRadius: 'var(--radius)', padding: '10px 6px', cursor: isLocked ? 'not-allowed' : 'pointer', textAlign: 'center', opacity: isLocked ? 0.7 : 1, transition: 'all .15s',
                  }}>
                  {k.foto_url
                    ? <img src={k.foto_url} alt={k.nama} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 5px', display: 'block', border: '1px solid var(--border)' }} />
                    : <div style={{ width: 36, height: 36, borderRadius: '50%', background: COLORS[i % COLORS.length], margin: '0 auto 5px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                        {inisial(k.nama)}
                      </div>
                  }
                  <div style={{ fontSize:11, fontWeight:600 }}>{k.nama.split(' ')[0]}</div>
                  <div style={{ fontSize:9, color:'var(--text3)', marginTop:1 }}>{k.shift?.nama}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 8, marginTop: 4, display: 'inline-block', color: spColor }}>
                    {st || 'Belum'}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Action panel */}
          {selected && (
            <div style={{ margin: '0 16px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>{selected.nama}</div>
              <div style={{ fontSize:11, color:'var(--text3)', marginBottom:12 }}>
                {selected.shift?.nama} · {selected.shift?.jam_masuk} – {selected.shift?.jam_keluar}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[
                  { type:'masuk',  label:'↗ Absen Masuk',  disabled:locked||st==='hadir', bg:'var(--green)',  color:'#fff'          },
                  { type:'keluar', label:'↙ Absen Keluar', disabled:locked||!st,          bg:'var(--bg3)',    color:'var(--red)'    },
                  { type:'sakit',  label:'🤒 Sakit',        disabled:locked,               bg:'var(--redbg)', color:'var(--red)'    },
                  { type:'izin',   label:'📋 Izin',         disabled:locked,               bg:'var(--amberbg)',color:'var(--amber)'  },
                ].map(btn => (
                  <button key={btn.type} disabled={btn.disabled} onClick={() => doAbsen(btn.type)}
                    style={{ padding: '11px 8px', borderRadius: 'var(--radius-sm)', border: 'none', fontSize: 12, fontWeight: 700, cursor: btn.disabled ? 'not-allowed' : 'pointer', opacity: btn.disabled ? 0.35 : 1, background: btn.bg, color: btn.color, fontFamily: 'inherit' }}>
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── 2. SECTION RIWAYAT AKTIVITAS (LOG BARU) ── */}
          {aktifitas.length > 0 && (
            <div style={{ padding: '10px 16px 0' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
                Aktivitas Hari Ini
              </p>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 14px', display: 'flex', flexDirection: 'column' }}>
                {aktifitas.map((act, index) => (
                  <div key={act.id} style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0',
                    borderBottom: index === aktifitas.length - 1 ? 'none' : '1px solid var(--border)' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <span>{act.icon}</span>
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{act.nama}</span>{' '}
                        <span style={{ color: 'var(--text2)' }}>{act.text}</span>
                      </div>
                    </div>
                    <div style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text3)', fontSize: 12, fontWeight: 600 }}>
                      {act.jam}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* ────────────────────────────────────────────── */}
        </>
      )}

      {/* Popup konfirmasi */}
      {popup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 500, display: 'flex', alignItems: 'center', justifyCenter: 'center' }} onClick={() => setPopup(null)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 20, padding: '28px 24px', width: 'calc(100% - 48px)', maxWidth: 340, textAlign: 'center', margin: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:40, marginBottom:12 }}>{popup.icon}</div>
            <div style={{ fontSize:17, fontWeight:800, marginBottom:6 }}>{popup.title}</div>
            <div style={{ fontSize:12, color:'var(--text2)', marginBottom:8 }}>{popup.sub}</div>
            <div style={{ fontSize:28, fontWeight:700, fontFamily:'DM Mono,monospace', margin:'8px 0' }}>{popup.jam}</div>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:18 }}>{popup.nama}</div>
            <button onClick={() => setPopup(null)} style={{ width: '100%', padding: 12, background: popup.warna, color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              OK, Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  )
}