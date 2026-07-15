// frontend/src/api/index.js
// GANTI SELURUH FILE ini — pakai Supabase JS Client, bukan axios

import { supabase } from '../lib/supabase'

// ─── Helper throw error ───────────────────────────────────────
function check(error, data) {
  if (error) throw new Error(error.message)
  return { data }
}

// Ganti fungsi getAbsensiBulan lama dengan memanggil VIEW
export const getRingkasanAbsen = (id, b, t) => 
  api.get(`/rekap_absensi_karyawan?karyawan_id=eq.${id}&bulan=eq.${b}&tahun=eq.${t}`)
  
// ─── Helper format rupiah ─────────────────────────────────────
export const rupiah = (n) =>
  'Rp ' + Math.round(n || 0).toLocaleString('id-ID')

// ═════════════════════════════════════════════════════════════
// KARYAWAN
// ═════════════════════════════════════════════════════════════

// Ambil semua karyawan aktif beserta jabatan & shift
export async function getKaryawan() {
  const { data, error } = await supabase
    .from('karyawan')
    .select(`
      id, nama, tanggal_masuk, jadwal_mingguan, aktif, foto_url,
      jabatan ( id, nama, gaji_pokok, tunjangan ),
      shift   ( id, nama, jam_masuk, jam_keluar )
    `)
    .eq('aktif', true)
    .order('nama')
  return check(error, data)
}

// Ambil satu karyawan by ID
export async function getKaryawanById(id) {
  const { data, error } = await supabase
    .from('karyawan')
    .select(`
      id, nama, tanggal_masuk, jadwal_mingguan, aktif, foto_url,
      jabatan_id, shift_id,
      jabatan ( id, nama, gaji_pokok, tunjangan ),
      shift   ( id, nama, jam_masuk, jam_keluar )
    `)
    .eq('id', id)
    .single()
  return check(error, data)
}

// Tambah karyawan baru
export async function createKaryawan(body) {
  const { data, error } = await supabase
    .from('karyawan')
    .insert(body)
    .select()
    .single()
  return check(error, data)
}

// Update karyawan
export async function updateKaryawan(id, body) {
  const { data, error } = await supabase
    .from('karyawan')
    .update(body)
    .eq('id', id)
    .select()
    .single()
  return check(error, data)
}

// ═════════════════════════════════════════════════════════════
// ABSENSI
// ═════════════════════════════════════════════════════════════

// Ambil absensi semua karyawan untuk satu tanggal
export async function getAbsensi(tanggal) {
  const { data, error } = await supabase
    .from('absensi')
    .select('*, karyawan(nama)')
    .eq('tanggal', tanggal)
  return check(error, data)
}

// Rekap absensi satu karyawan per bulan
// Mengembalikan { data: { detail: [...], ringkasan: {...} } }
export async function getAbsensiBulan(karyawan_id, bulan, tahun) {
  const dari   = `${tahun}-${String(bulan).padStart(2, '0')}-01`
  const hari   = new Date(tahun, bulan, 0).getDate()
  const sampai = `${tahun}-${String(bulan).padStart(2, '0')}-${String(hari).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('absensi')
    .select('tanggal, status, jam_masuk, jam_keluar')
    .eq('karyawan_id', karyawan_id)
    .gte('tanggal', dari)
    .lte('tanggal', sampai)
    .order('tanggal')

  if (error) throw new Error(error.message)

  // Hitung ringkasan
  const ringkasan = { hadir: 0, sakit: 0, izin: 0, libur: 0 }
  ;(data || []).forEach(a => {
    if (ringkasan[a.status] !== undefined) ringkasan[a.status]++
  })

  return { data: { detail: data || [], ringkasan } }
}

// Upsert absensi (insert atau update jika sudah ada)
export async function postAbsensi(body) {
  // Hapus field undefined agar tidak error
  const payload = Object.fromEntries(
    Object.entries(body).filter(([, v]) => v !== undefined)
  )
  const { data, error } = await supabase
    .from('absensi')
    .upsert(payload, { onConflict: 'karyawan_id,tanggal' })
    .select()
    .single()
  return check(error, data)
}

// ═════════════════════════════════════════════════════════════
// PASANG HARIAN
// ═════════════════════════════════════════════════════════════

// Ambil semua pasang untuk satu tanggal
export async function getPasang(tanggal) {
  const { data, error } = await supabase
    .from('pasang_harian')
    .select('*, karyawan(nama)')
    .eq('tanggal', tanggal)
  return check(error, data)
}

// Upsert pasang harian — bonus dihitung dari pengaturan
export async function postPasang({ karyawan_id, tanggal, jumlah_pasang }) {
  // Ambil pengaturan bonus
  const cfg = await getPengaturan()
  const target = parseInt(cfg.data?.target_pasang)      || 5
  const bpp    = parseInt(cfg.data?.bonus_per_pasang)   || 5000
  const ppp    = parseInt(cfg.data?.potong_per_pasang)  || 0
  const lebih  = jumlah_pasang - target
  const bonus_dihitung = lebih > 0 ? lebih * bpp : lebih < 0 ? lebih * ppp : 0

  const { data, error } = await supabase
    .from('pasang_harian')
    .upsert(
      { karyawan_id, tanggal, jumlah_pasang, bonus_dihitung },
      { onConflict: 'karyawan_id,tanggal' }
    )
    .select()
    .single()
  return check(error, data)
}

// ═════════════════════════════════════════════════════════════
// BONUS & POTONGAN MANUAL
// ═════════════════════════════════════════════════════════════

export async function getBonus(karyawan_id, bulan, tahun) {
  const dari   = `${tahun}-${String(bulan).padStart(2, '0')}-01`
  const hari   = new Date(tahun, bulan, 0).getDate()
  const sampai = `${tahun}-${String(bulan).padStart(2, '0')}-${String(hari).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('bonus_potongan')
    .select('*')
    .eq('karyawan_id', karyawan_id)
    .gte('tanggal', dari)
    .lte('tanggal', sampai)
  return check(error, data)
}

export async function postBonus(body) {
  const { data, error } = await supabase
    .from('bonus_potongan')
    .insert(body)
    .select()
    .single()
  return check(error, data)
}

// ═════════════════════════════════════════════════════════════
// GAJI — Kini Mendukung Filter Tanggal Kustom (Frontend-Driven)
// ═════════════════════════════════════════════════════════════

export async function getGaji(karyawan_id, bulan, tahun, filterTanggal = null) {
  let dari, sampai
  let usingCustomPeriod = false

  // Jika admin mengisi filter rentang tanggal kustom dari UI
  if (filterTanggal && filterTanggal.dari && filterTanggal.sampai) {
    // Normalisasi: pastikan hanya ambil bagian YYYY-MM-DD,
    // jaga-jaga kalau ada komponen jam/timezone ikut terbawa dari input
    dari   = String(filterTanggal.dari).split('T')[0]
    sampai = String(filterTanggal.sampai).split('T')[0]
    usingCustomPeriod = true

    // Kalau user kebalik pilih tanggal (dari > sampai), tukar otomatis
    // supaya query tidak salah arah / kosong tanpa penjelasan
    if (dari > sampai) {
      const tmp = dari
      dari = sampai
      sampai = tmp
    }
  } else {
    // Jalur bawaan: hitung otomatis berdasarkan bulan & tahun berjalan
    dari = `${tahun}-${String(bulan).padStart(2, '0')}-01`
    const hari = new Date(tahun, bulan, 0).getDate()
    sampai = `${tahun}-${String(bulan).padStart(2, '0')}-${String(hari).padStart(2, '0')}`
  }

  // Ambil semua data yang dibutuhkan sekaligus berdasarkan rentang 'dari' & 'sampai'
  const [karyRes, absenRes, pasangRes, bonusRes] = await Promise.all([
    supabase.from('karyawan')
      .select('nama, jabatan(gaji_pokok, tunjangan)')
      .eq('id', karyawan_id)
      .single(),
    supabase.from('absensi')
      // PENTING: ambil 'tanggal' juga, bukan cuma 'status' —
      // dibutuhkan untuk dedupe di bawah
      .select('tanggal, status')
      .eq('karyawan_id', karyawan_id)
      .gte('tanggal', dari).lte('tanggal', sampai),
    supabase.from('pasang_harian')
      .select('bonus_dihitung')
      .eq('karyawan_id', karyawan_id)
      .gte('tanggal', dari).lte('tanggal', sampai),
    supabase.from('bonus_potongan')
      .select('tipe, nominal, keterangan, tanggal')
      .eq('karyawan_id', karyawan_id)
      .gte('tanggal', dari).lte('tanggal', sampai),
  ])

  if (karyRes.error) throw new Error(karyRes.error.message)
  if (absenRes.error) throw new Error(absenRes.error.message)
  if (pasangRes.error) throw new Error(pasangRes.error.message)
  if (bonusRes.error) throw new Error(bonusRes.error.message)

  const kary   = karyRes.data
  const pasang = pasangRes.data || []
  const bonus  = bonusRes.data  || []

  // ── DEDUPE PER TANGGAL ──────────────────────────────────────
  // Kalau ada lebih dari satu baris absensi untuk tanggal yang sama
  // (misal karena double-insert / data lama sebelum pakai upsert),
  // pastikan tiap TANGGAL hanya dihitung SEKALI di ringkasan.
  // Ini akar masalah kenapa "2 potongan absen" bisa muncul padahal
  // yang benar cuma 1 hari.
  const absenByTanggal = new Map()
  ;(absenRes.data || []).forEach(a => {
    absenByTanggal.set(a.tanggal, a.status)
  })

  const ringkasan_absen = { hadir: 0, sakit: 0, izin: 0, libur: 0 }
  absenByTanggal.forEach(status => {
    if (ringkasan_absen[status] !== undefined) ringkasan_absen[status]++
  })

  // Kalkulasi
  const gaji_pokok      = kary.jabatan?.gaji_pokok || 0
  const tunjangan       = kary.jabatan?.tunjangan  || 0
  const bonus_pasang    = pasang.reduce((s, p) => s + (p.bonus_dihitung || 0), 0)
  const bonus_manual    = bonus.filter(b => b.tipe === 'bonus')   .reduce((s, b) => s + b.nominal, 0)
  const potongan_manual = bonus.filter(b => b.tipe === 'potongan').reduce((s, b) => s + b.nominal, 0)
  const total_bonus     = bonus_pasang + bonus_manual
  const total_potongan  = potongan_manual
  const gaji_bersih     = gaji_pokok + tunjangan + total_bonus - total_potongan

  return {
    data: {
      karyawan: kary.nama,
      bulan, tahun,
      periode_custom: usingCustomPeriod ? { dari, sampai } : null,
      rincian: { gaji_pokok, tunjangan, bonus_pasang, bonus_manual, potongan_manual },
      ringkasan_absen,
      detail_bonus: bonus,
      total_bonus,
      total_potongan,
      gaji_bersih,
    }
  }
}

// ═════════════════════════════════════════════════════════════
// JABATAN
// ═════════════════════════════════════════════════════════════

export async function getJabatan() {
  const { data, error } = await supabase
    .from('jabatan').select('*').order('nama')
  return check(error, data)
}

export async function createJabatan(body) {
  const { data, error } = await supabase
    .from('jabatan').insert(body).select().single()
  return check(error, data)
}

export async function updateJabatan(id, body) {
  const { data, error } = await supabase
    .from('jabatan')
    .update({ nama: body.nama, gaji_pokok: body.gaji_pokok, tunjangan: body.tunjangan })
    .eq('id', id).select().single()
  return check(error, data)
}

export async function deleteJabatan(id) {
  const { error } = await supabase
    .from('jabatan').delete().eq('id', id)
  return check(error, null)
}

// ═════════════════════════════════════════════════════════════
// SHIFT
// ═════════════════════════════════════════════════════════════

export async function getShift() {
  const { data, error } = await supabase
    .from('shift').select('*').order('nama')
  return check(error, data)
}

export async function createShift(body) {
  // Cek maksimal 3 shift
  const { count } = await supabase
    .from('shift').select('*', { count: 'exact', head: true })
  if (count >= 3) throw new Error('Maksimal 3 shift')

  const { data, error } = await supabase
    .from('shift').insert(body).select().single()
  return check(error, data)
}

export async function updateShift(id, body) {
  const { data, error } = await supabase
    .from('shift')
    .update({ nama: body.nama, jam_masuk: body.jam_masuk, jam_keluar: body.jam_keluar })
    .eq('id', id).select().single()
  return check(error, data)
}

export async function deleteShift(id) {
  // Cek apakah shift masih dipakai
  const { count } = await supabase
    .from('karyawan').select('*', { count: 'exact', head: true }).eq('shift_id', id)
  if (count > 0) throw new Error(`Shift masih dipakai ${count} karyawan`)

  const { error } = await supabase
    .from('shift').delete().eq('id', id)
  return check(error, null)
}

// ═════════════════════════════════════════════════════════════
// PENGATURAN — key-value store
// ═════════════════════════════════════════════════════════════

// Kembalikan sebagai object: { target_pasang: '5', ... }
export async function getPengaturan() {
  const { data, error } = await supabase
    .from('pengaturan').select('kunci, nilai')
  if (error) throw new Error(error.message)
  const result = {}
  ;(data || []).forEach(r => { result[r.kunci] = r.nilai })
  return { data: result }
}

// Terima object { target_pasang: '5', bonus_per_pasang: '5000', ... }
export async function savePengaturan(obj) {
  const rows = Object.entries(obj).map(([kunci, nilai]) => ({
    kunci,
    nilai: String(nilai),
    updated_at: new Date().toISOString(),
  }))
  const { error } = await supabase
    .from('pengaturan')
    .upsert(rows, { onConflict: 'kunci' })
  return check(error, null)
}

// ═════════════════════════════════════════════════════════════
// UPLOAD FOTO — Supabase Storage
// ═════════════════════════════════════════════════════════════

export async function uploadFotoKaryawan(karyawan_id, file) {
  const ext      = file.name.split('.').pop()
  const filePath = `foto/${karyawan_id}.${ext}`

  // Upload ke bucket "karyawan-foto"
  const { error: upErr } = await supabase.storage
    .from('karyawan-foto')
    .upload(filePath, file, { upsert: true, contentType: file.type })
  if (upErr) throw new Error(upErr.message)

  // Ambil public URL
  const { data } = supabase.storage
    .from('karyawan-foto')
    .getPublicUrl(filePath)
  const foto_url = data.publicUrl

  // Update kolom foto_url di tabel karyawan
  await supabase.from('karyawan')
    .update({ foto_url })
    .eq('id', karyawan_id)

  return foto_url
}