import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
  }
})

// ── KARYAWAN ──────────────────────────────
export const getKaryawan     = ()           => api.get('/karyawan')
export const getKaryawanById = (id)         => api.get(`/karyawan?id=eq.${id}`) // Format query Supabase
export const createKaryawan  = (body)       => api.post('/karyawan', body)
export const updateKaryawan  = (id, body)   => api.put(`/karyawan?id=eq.${id}`, body)

// ── ABSENSI ───────────────────────────────
export const getAbsensi      = (tanggal)    => api.get('/absensi', { params: { tanggal: `eq.${tanggal}` } })
export const getAbsensiBulan = (id, b, t)   => api.get('/absensi', { params: { karyawan_id: `eq.${id}`, bulan: `eq.${b}`, tahun: `eq.${t}` } })
export const postAbsensi     = (body)       => api.post('/absensi', body)

// ── PASANG ────────────────────────────────
export const getPasang       = (tanggal)    => api.get('/pasang', { params: { tanggal: `eq.${tanggal}` } })
export const postPasang      = (body)       => api.post('/pasang', body)

// ── BONUS ─────────────────────────────────
export const getBonus        = (id, b, t)   => api.get('/bonus', { params: { karyawan_id: `eq.${id}`, bulan: `eq.${b}`, tahun: `eq.${t}` } })
export const postBonus       = (body)       => api.post('/bonus', body)

// ── GAJI ──────────────────────────────────
export const getGaji         = (id, b, t)   => api.get('/gaji', { params: { karyawan_id: `eq.${id}`, bulan: `eq.${b}`, tahun: `eq.${t}` } })

// ── JABATAN ───────────────────────────────
export const getJabatan      = ()           => api.get('/jabatan')
export const createJabatan   = (body)       => api.post('/jabatan', body)
export const updateJabatan   = (id, body)   => api.put(`/jabatan?id=eq.${id}`, body)
export const deleteJabatan   = (id)         => api.delete(`/jabatan?id=eq.${id}`)

export const getShift    = ()           => api.get('/shift')
export const createShift = (body)       => api.post('/shift', body)
export const updateShift = (id, body)   => api.put(`/shift?id=eq.${id}`, body)
export const deleteShift = (id)         => api.delete(`/shift?id=eq.${id}`)

// ── PENGATURAN ────────────────────────────
export const getPengaturan   = ()           => api.get('/pengaturan')
export const savePengaturan  = (body)       => api.patch(`/pengaturan?id=eq.${body.id || 1}`, body)

export const rupiah = (n) =>
  'Rp ' + Math.round(n || 0).toLocaleString('id-ID')