import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import html2pdf from 'html2pdf.js'

// Format Rupiah pembantu
const formatRupiah = (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')

// ════════════════════ 1. FUNGSI EKSPOR EXCEL ════════════════════
export async function unduhExcelHRD(dataKaryawan, periodeBulan, periodeTahun) {
  const workbook = new ExcelJS.Workbook()
  
  // ---- TAB 1: DASHBOARD ----
  const ws1 = workbook.addWorksheet('Ringkasan Dashboard')
  ws1.views = [{ showGridLines: true }]
  
  ws1.cell('A1').value = "ShoeCare HRD - Laporan Eksekutif Bulanan"
  ws1.cell('A1').font = { name: 'Arial', size: 16, bold: true, color: { argb: '1F4E79' } }
  ws1.cell('A2').value = `Periode: ${periodeBulan} ${periodeTahun} | Toko Utama ShoeCare`
  ws1.cell('A2').font = { name: 'Arial', size: 10, italic: true }

  // Hitung total ringkasan
  const totalKaryawan = dataKaryawan.length
  const totalGaji = dataKaryawan.reduce((sum, k) => sum + (k.gaji_bersih || 0), 0)

  // Card 1: Total Karyawan
  ws1.mergeCells('B4:C4'); ws1.cell('B4').value = "Total Karyawan"
  ws1.cell('B4').font = { name: 'Arial', size: 10, bold: true, color: { argb: '595959' } }
  ws1.mergeCells('B5:C5'); ws1.cell('B5').value = `${totalKaryawan} Orang`
  ws1.cell('B5').font = { name: 'Arial', size: 14, bold: true, color: { argb: '1F4E79' } }

  // Card 2: Total Pengeluaran Gaji
  ws1.mergeCells('E4:F4'); ws1.cell('E4').value = "Total Gaji Bersih"
  ws1.cell('E4').font = { name: 'Arial', size: 10, bold: true, color: { argb: '595959' } }
  ws1.mergeCells('E5:F5'); ws1.cell('E5').value = totalGaji
  ws1.cell('E5').font = { name: 'Arial', size: 14, bold: true, color: { argb: '1F4E79' } }
  ws1.cell('E5').number_format = '"Rp "#,##0'

  // Beri warna latar belakang biru muda pada Card Dashboard
  ['B4','B5','C4','C5','E4','E5','F4','F5'].forEach(cellId => {
    ws1.cell(cellId).fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'DDEBF7'} }
  })

  // ---- TAB 2: REKAP GAJI ----
  const ws2 = workbook.addWorksheet('Rekap Gaji & Absensi')
  ws2.views = [{ showGridLines: true }]

  ws2.cell('A1').value = "Rekapitulasi Gaji & Kehadiran Karyawan"
  ws2.cell('A1').font = { name: 'Arial', size: 14, bold: true, color: { argb: '1F4E79' } }

  // Header Tabel
  const headers = ["Nama Karyawan", "Jabatan", "Hadir", "Sakit/Izin", "Gaji Pokok", "Tunjangan", "Bonus Pasang", "Gaji Bersih"]
  const headerRow = ws2.addRow(headers)
  headerRow.eachCell(cell => {
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E79' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  // Isi Data Karyawan dari Supabase
  dataKaryawan.forEach((k, idx) => {
    const r = ws2.addRow([
      k.nama,
      k.jabatan?.nama || '-',
      k.total_hadir || 0,
      k.total_izin_sakit || 0,
      k.gaji_pokok || 0,
      k.tunjangan || 0,
      k.bonus_pasang || 0,
      k.gaji_bersih || 0
    ])

    // Zebra striping warna baris bergantian
    const rowFill = idx % 2 === 1 ? 'F2F4F8' : 'FFFFFF'
    r.eachCell((cell, colNum) => {
      cell.font = { name: 'Arial', size: 11 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowFill } }
      cell.border = { top: {style:'thin', color:{argb:'D9D9D9'}}, bottom: {style:'thin', color:{argb:'D9D9D9'}}, left: {style:'thin', color:{argb:'D9D9D9'}}, right: {style:'thin', color:{argb:'D9D9D9'}} }
      
      if (colNum >= 5) {
        cell.number_format = '"Rp "#,##0'
        cell.alignment = { horizontal: 'right' }
      } else if (colNum === 3 || colNum === 4) {
        cell.alignment = { horizontal: 'center' }
      }
    })
  })

  // Atur lebar kolom otomatis
  ws2.columns.forEach(col => { col.width = 18 })

  // Jalankan download file ke HP
  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer]), `Laporan_ShoeCare_HRD_${periodeBulan}_${periodeTahun}.xlsx`)
}


// ════════════════════ 2. FUNGSI EKSPOR PDF ════════════════════
export function unduhPdfHRD(dataKaryawan, periodeBulan, periodeTahun) {
  const totalGaji = dataKaryawan.reduce((sum, k) => sum + (k.gaji_bersih || 0), 0)
  const tanggalHariIni = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  // Membuat baris tabel HTML secara dinamis berdasarkan data karyawan
  const barisTabelHtml = dataKaryawan.map(k => `
    <tr>
      <td style="font-weight: bold; padding: 10px 8px; border: 1px solid #E2E8F0;">${k.nama}</td>
      <td style="padding: 10px 8px; border: 1px solid #E2E8F0;">${k.jabatan?.nama || '-'}</td>
      <td style="text-align: center; padding: 10px 8px; border: 1px solid #E2E8F0;">${k.total_hadir || 0}</td>
      <td style="text-align: center; padding: 10px 8px; border: 1px solid #E2E8F0;">${k.total_izin_sakit || 0}</td>
      <td style="text-align: right; padding: 10px 8px; border: 1px solid #E2E8F0;">${formatRupiah(k.gaji_pokok)}</td>
      <td style="text-align: right; padding: 10px 8px; border: 1px solid #E2E8F0;">${formatRupiah(k.tunjangan)}</td>
      <td style="text-align: right; padding: 10px 8px; border: 1px solid #E2E8F0;">${formatRupiah(k.bonus_pasang)}</td>
      <td style="text-align: right; font-weight: bold; padding: 10px 8px; border: 1px solid #E2E8F0;">${formatRupiah(k.gaji_bersih)}</td>
    </tr>
  `).join('')

  // Rangkaian struktur HTML & CSS template PDF resmi
  const elementHtmlLaporan = `
    <div style="font-family: 'Arial', sans-serif; padding: 20px; color: #2c3e50;">
      <div style="border-bottom: 3px solid #1F4E79; padding-bottom: 10px; margin-bottom: 20px;">
        <div style="font-size: 24pt; font-weight: bold; color: #1F4E79;">SHOECARE HRD</div>
        <div style="font-size: 11pt; color: #7f8c8d; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px;">Laporan Rekapitulasi Bulanan Kehadiran & Penggajian</div>
      </div>

      <table style="width: 100%; margin-bottom: 20px; font-size: 10pt;">
        <tr>
          <td style="width: 18%; font-weight: bold;">Periode Laporan</td>
          <td>: ${periodeBulan} ${periodeTahun}</td>
          <td style="width: 18%; font-weight: bold;">Tanggal Cetak</td>
          <td>: ${tanggalHariIni}</td>
        </tr>
      </table>

      <div style="font-size: 12pt; font-weight: bold; color: #1F4E79; margin-bottom: 10px;">Ringkasan Eksekutif</div>
      <div style="display: flex; gap: 10px; margin-bottom: 25px;">
        <div style="flex: 1; background-color: #F2F4F8; border: 1px solid #DDEBF7; padding: 12px; text-align: center; border-radius: 4px;">
          <div style="font-size: 9pt; color: #7f8c8d; font-weight: bold;">TOTAL KARYAWAN</div>
          <div style="font-size: 16pt; font-weight: bold; color: #1F4E79; margin-top: 5px;">${dataKaryawan.length} Orang</div>
        </div>
        <div style="flex: 1; background-color: #F2F4F8; border: 1px solid #DDEBF7; padding: 12px; text-align: center; border-radius: 4px;">
          <div style="font-size: 9pt; color: #7f8c8d; font-weight: bold;">TOTAL PENGELUARAN GAJI</div>
          <div style="font-size: 16pt; font-weight: bold; color: #1F4E79; margin-top: 5px;">${formatRupiah(totalGaji)}</div>
        </div>
      </div>

      <div style="font-size: 12pt; font-weight: bold; color: #1F4E79; margin-bottom: 10px;">Rincian Gaji & Kehadiran</div>
      <table style="width: 100%; border-collapse: collapse; font-size: 9pt;">
        <thead>
          <tr style="background-color: #1F4E79; color: white;">
            <th style="padding: 10px 8px; text-align: left;">Nama</th>
            <th style="padding: 10px 8px; text-align: left;">Jabatan</th>
            <th style="padding: 10px 8px; text-align: center;">Hadir</th>
            <th style="padding: 10px 8px; text-align: center;">S/I</th>
            <th style="padding: 10px 8px; text-align: right;">Pokok</th>
            <th style="padding: 10px 8px; text-align: right;">Tunjangan</th>
            <th style="padding: 10px 8px; text-align: right;">Bonus</th>
            <th style="padding: 10px 8px; text-align: right;">Total Gaji</th>
          </tr>
        </thead>
        <tbody>
          ${barisTabelHtml}
        </tbody>
      </table>

      <table style="width: 100%; margin-top: 50px; font-size: 10pt;">
        <tr>
          <td>Disetujui Oleh,<br><br><br><br><br>____________________<br><b>Owner ShoeCare</b></td>
          <td style="text-align: right;">Yogyakarta, ${tanggalHariIni}<br>Dibuat Oleh,<br><br><br><br><br>____________________<br><b>Sistem HRD Cloud</b></td>
        </tr>
      </table>
    </div>
  `

  // Konfigurasi konversi html2pdf agar pas di kertas HP/A4 Android
  const opsi = {
    margin:       10,
    filename:     `Laporan_ShoeCare_HRD_${periodeBulan}_${periodeTahun}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }

  // Eksekusi pembuatan dan otomatis memicu download file PDF di HP
  html2pdf().from(elementHtmlLaporan).set(opsi).save()
}