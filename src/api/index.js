// frontend/src/api/index.js
// GANTI SELURUH FILE ini — pakai Supabase JS Client, bukan axios

import { supabase } from '../lib/supabase'

// ─── Helper throw error ───────────────────────────────────────
function check(error, data) {
  if (error) throw new Error(error.message)
  return { data }
}

// Rekap menggunakan sumber data yang sama dengan halaman absensi.
export const getRingkasanAbsen = (id, b, t) => getAbsensiBulan(id, b, t)
  
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
      id, nama, tanggal_masuk, jadwal_mingguan, aktif, foto_url, target_pasang,
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
      jabatan_id, shift_id, target_pasang,
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
  // Target bersifat individual; bonus & potongan tetap kebijakan global.
  const [cfg, karyRes] = await Promise.all([
    getPengaturan(),
    supabase
      .from('karyawan')
      .select('target_pasang')
      .eq('id', karyawan_id)
      .single(),
  ])

  if (karyRes.error) throw new Error(karyRes.error.message)

  const jumlah = parseInt(jumlah_pasang, 10) || 0
  const target = parseInt(karyRes.data?.target_pasang, 10) || 5
  const bpp    = parseInt(cfg.data?.bonus_per_pasang, 10) || 5000
  const ppp    = parseInt(cfg.data?.potong_per_pasang, 10) || 0

  const lebih = jumlah - target

  // Positif = bonus, negatif = potongan target.
  const bonus_dihitung =
    lebih > 0 ? lebih * bpp :
    lebih < 0 ? lebih * ppp :
    0

  const { data, error } = await supabase
    .from('pasang_harian')
    .upsert(
      {
        karyawan_id,
        tanggal,
        jumlah_pasang: jumlah,
        bonus_dihitung,
      },
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

export async function getBonusRentang(karyawan_id, dari, sampai) {
  const { data, error } = await supabase.from('bonus_potongan').select('*')
    .eq('karyawan_id', karyawan_id).gte('tanggal', dari).lte('tanggal', sampai).order('tanggal', { ascending: false })
  return check(error, data)
}

export async function postBonus(body) {
  if (!['bonus', 'potongan', 'kasbon'].includes(body.tipe) || !(Number(body.nominal) > 0)) throw new Error('Jenis dan nominal tidak valid')
  const { data, error } = await supabase
    .from('bonus_potongan')
    .insert({ ...body, nominal: Number(body.nominal), tipe: body.tipe === 'kasbon' ? 'potongan' : body.tipe, keterangan: body.tipe === 'kasbon' ? `Kasbon — ${body.keterangan || 'Cicilan kasbon'}` : body.keterangan })
    .select()
    .single()
  return check(error, data)
}

export async function deleteBonus(id) {
  const { error } = await supabase.from('bonus_potongan').delete().eq('id', id)
  return check(error, null)
}

// Pengecualian harian tidak mengubah jadwal mingguan permanen.
export async function getJadwalKhusus(dari, sampai, karyawan_id = null) {
  let query = supabase.from('jadwal_khusus').select('*').gte('tanggal', dari).lte('tanggal', sampai)
  if (karyawan_id) query = query.eq('karyawan_id', karyawan_id)
  const { data, error } = await query.order('tanggal')
  return check(error, data)
}

export async function simpanJadwalKhusus(body) {
  const { data, error } = await supabase.from('jadwal_khusus')
    .upsert(body, { onConflict: 'karyawan_id,tanggal' }).select().single()
  return check(error, data)
}

export async function hapusJadwalKhusus(id) {
  const { error } = await supabase.from('jadwal_khusus').delete().eq('id', id)
  return check(error, null)
}

// Kasbon: pencairan dicatat terpisah dari potongan gaji, untuk menjaga saldo.
export async function getKasbon(karyawan_id = null) {
  let q = supabase.from('kasbon').select('*').order('tanggal', { ascending: false })
  if (karyawan_id) q = q.eq('karyawan_id', karyawan_id)
  const { data, error } = await q
  return check(error, data)
}

export async function buatKasbon(body) {
  if (!(Number(body.nominal) > 0)) throw new Error('Nominal kasbon harus positif')
  const { data, error } = await supabase.from('kasbon').insert({ ...body, nominal: Number(body.nominal) }).select().single()
  return check(error, data)
}

export async function getCicilanKasbon(dari = null, sampai = null, karyawan_id = null) {
  let q = supabase.from('kasbon_cicilan').select('*').order('tanggal', { ascending: false })
  if (dari) q = q.gte('tanggal', dari)
  if (sampai) q = q.lte('tanggal', sampai)
  if (karyawan_id) q = q.eq('karyawan_id', karyawan_id)
  const { data, error } = await q
  return check(error, data)
}

export async function tambahCicilanKasbon(body) {
  if (!(Number(body.nominal) > 0)) throw new Error('Nominal cicilan tidak valid')
  const { data, error } = await supabase.rpc('catat_cicilan_kasbon', { p_kasbon_id: body.kasbon_id, p_tanggal: body.tanggal, p_nominal: Number(body.nominal), p_keterangan: body.keterangan || '' })
  return check(error, data)
}

export async function tukarJadwal({ karyawan_a, tanggal_a, karyawan_b, tanggal_b, keterangan }) {
  const { data, error } = await supabase.rpc('tukar_jadwal', { p_karyawan_a: karyawan_a, p_tanggal_a: tanggal_a, p_karyawan_b: karyawan_b, p_tanggal_b: tanggal_b, p_keterangan: keterangan || '' })
  return check(error, data)
}

export async function koreksiAbsensi({ karyawan_id, tanggal, status, jam_masuk, jam_keluar, alasan }) {
  const { data, error } = await supabase.rpc('koreksi_absensi', { p_karyawan_id: karyawan_id, p_tanggal: tanggal, p_status: status, p_jam_masuk: jam_masuk || null, p_jam_keluar: jam_keluar || null, p_alasan: alasan })
  return check(error, data)
}

export async function getAudit(limit = 50) {
  const { data, error } = await supabase.from('staffora_audit').select('*').order('waktu', { ascending: false }).limit(limit)
  return check(error, data)
}

export async function getPayrollSnapshot(karyawan_id, dari, sampai) {
  const { data, error } = await supabase.from('payroll_snapshot').select('*')
    .eq('karyawan_id', karyawan_id).eq('periode_dari', dari).eq('periode_sampai', sampai).maybeSingle()
  return check(error, data)
}

export async function simpanPayrollSnapshot(body) {
  const { data, error } = await supabase.from('payroll_snapshot').upsert(body, { onConflict: 'karyawan_id,periode_dari,periode_sampai' }).select().single()
  return check(error, data)
}

// ═════════════════════════════════════════════════════════════
// GAJI — Kini Mendukung Filter Tanggal Kustom (Frontend-Driven)
// ═════════════════════════════════════════════════════════════

export async function getGaji(karyawan_id, bulan, tahun, filterTanggal = null) {
  let dari, sampai
  let usingCustomPeriod = false

  if (filterTanggal && filterTanggal.dari && filterTanggal.sampai) {
    dari   = String(filterTanggal.dari).split('T')[0]
    sampai = String(filterTanggal.sampai).split('T')[0]
    usingCustomPeriod = true
    if (dari > sampai) { const tmp = dari; dari = sampai; sampai = tmp }
  } else {
    dari = `${tahun}-${String(bulan).padStart(2, '0')}-01`
    const hari = new Date(tahun, bulan, 0).getDate()
    sampai = `${tahun}-${String(bulan).padStart(2, '0')}-${String(hari).padStart(2, '0')}`
  }

  // Periode yang sudah dibayar selalu memakai snapshot historis.
  // Dashboard, Keuangan dan Detail Karyawan tidak boleh menghitung ulang nominal ini.
  const snapshotRes = await getPayrollSnapshot(karyawan_id, dari, sampai)
  if (snapshotRes.data?.status === 'dibayar') {
    const snapshotGaji = snapshotRes.data.rincian
    if (!snapshotGaji || typeof snapshotGaji.gaji_bersih !== 'number') {
      throw new Error('Snapshot gaji dibayar tidak valid. Hubungi HR untuk pemeriksaan data.')
    }
    return { data: snapshotGaji }
  }


  const [karyRes, absenRes, pasangRes, bonusRes, cicilanRes, cfgRes, jadwalRes] = await Promise.all([
    supabase.from('karyawan')
      .select('nama, tanggal_masuk, jadwal_mingguan, jabatan(gaji_pokok, tunjangan)')
      .eq('id', karyawan_id)
      .single(),
    supabase.from('absensi')
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
    supabase.from('kasbon_cicilan').select('nominal, tanggal, keterangan')
      .eq('karyawan_id', karyawan_id).gte('tanggal', dari).lte('tanggal', sampai),
    getPengaturan(),
    getJadwalKhusus(dari, sampai, karyawan_id),
  ])

  if (karyRes.error) throw new Error(karyRes.error.message)
  if (absenRes.error) throw new Error(absenRes.error.message)
  if (pasangRes.error) throw new Error(pasangRes.error.message)
  if (bonusRes.error) throw new Error(bonusRes.error.message)
  if (cicilanRes.error) throw new Error(cicilanRes.error.message)

  const kary   = karyRes.data
  const pasang = pasangRes.data || []
  const bonus  = bonusRes.data  || []

  const absenByTanggal = new Map()
  ;(absenRes.data || []).forEach(a => { absenByTanggal.set(a.tanggal, a.status) })

  const ringkasan_absen = { hadir: 0, sakit: 0, izin: 0, libur: 0, mangkir: 0 }
  absenByTanggal.forEach(status => {
    if (ringkasan_absen[status] !== undefined) ringkasan_absen[status]++
  })

  // Tidak ada rekaman absensi pada hari kerja yang SUDAH BERLALU = mangkir.
  // Hari ini belum dinilai agar staf yang belum masuk tidak langsung dipotong.
  // Jadwal khusus/tukar shift selalu mendahului jadwal mingguan.
  const jadwalKhusus = new Map((jadwalRes.data || []).map(j => [j.tanggal, Number(j.shift_index)]))
  const tanggalHariIni = new Date()
  const today = `${tanggalHariIni.getFullYear()}-${String(tanggalHariIni.getMonth() + 1).padStart(2, '0')}-${String(tanggalHariIni.getDate()).padStart(2, '0')}`
  const jadwalMingguan = kary.jadwal_mingguan
  if (!Array.isArray(jadwalMingguan) || jadwalMingguan.length !== 7) {
    throw new Error(`Jadwal mingguan ${kary.nama} belum lengkap. Perbaiki jadwal sebelum menghitung gaji.`)
  }
  const hariMasuk = kary.tanggal_masuk || dari
  const awal = new Date(`${dari}T12:00:00`)
  const akhir = new Date(`${sampai}T12:00:00`)
  for (const d = awal; d <= akhir; d.setDate(d.getDate() + 1)) {
    const tanggal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (tanggal >= today || tanggal < hariMasuk || absenByTanggal.has(tanggal)) continue
    const hariIndex = (d.getDay() + 6) % 7 // Senin = 0, Minggu = 6
    const shiftIndex = jadwalKhusus.has(tanggal) ? jadwalKhusus.get(tanggal) : Number(jadwalMingguan[hariIndex])
    if (shiftIndex !== 3) ringkasan_absen.mangkir++
  }


  const gaji_pokok      = Number(kary.jabatan?.gaji_pokok || 0)
  const tunjangan       = Number(kary.jabatan?.tunjangan || 0)
  const bonus_pasang    = pasang.reduce((s, p) => s + Number(p.bonus_dihitung || 0), 0)
  const bonus_manual    = bonus.filter(b => b.tipe === 'bonus').reduce((s, b) => s + Number(b.nominal || 0), 0)
  const kasbonLama = bonus.filter(b => b.tipe === 'potongan' && /^Kasbon\s*[—-]/i.test(b.keterangan || '')).reduce((s, b) => s + Number(b.nominal || 0), 0)
  const cicilanBaru = (cicilanRes.data || []).reduce((s, b) => s + Number(b.nominal || 0), 0)
  // Saat dua mekanisme kasbon digunakan sekaligus, harus direkonsiliasi HR.
  // Tanpa relasi transaksi sumber, aplikasi tidak bisa memastikan bukan duplikat.
  if (kasbonLama > 0 && cicilanBaru > 0) {
    throw new Error('Ditemukan potongan kasbon lama dan cicilan kasbon baru pada periode yang sama. HR perlu merekonsiliasi transaksi sebelum payroll disahkan.')
  }
  const potongan_kasbon = kasbonLama + cicilanBaru
  const potongan_lainnya = bonus.filter(b => b.tipe === 'potongan' && !/^Kasbon\s*[—-]/i.test(b.keterangan || '')).reduce((s, b) => s + Number(b.nominal || 0), 0)
  const potongan_manual = potongan_kasbon + potongan_lainnya
  const tarifAbsen = cfgRes.data?.potong_absen === undefined ? 50000 : Math.max(0, Number(cfgRes.data.potong_absen) || 0)
  const potongan_absen = (ringkasan_absen.sakit + ringkasan_absen.izin + ringkasan_absen.mangkir) * tarifAbsen
  const total_bonus     = bonus_pasang + bonus_manual
  const total_potongan  = potongan_manual + potongan_absen
  const gaji_bersih     = gaji_pokok + tunjangan + total_bonus - total_potongan
  if (!Number.isFinite(gaji_bersih) || gaji_bersih < 0) {
    throw new Error('Nominal gaji tidak valid atau potongan melebihi pendapatan. HR harus meninjau payroll sebelum pembayaran.')
  }

  return {
    data: {
      karyawan: kary.nama,
      bulan, tahun,
      periode_custom: usingCustomPeriod ? { dari, sampai } : null,
      rincian: { gaji_pokok, tunjangan, bonus_pasang, bonus_manual, potongan_manual, potongan_kasbon, potongan_lainnya, potongan_absen },
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
