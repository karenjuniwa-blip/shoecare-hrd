import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getKaryawan, rupiah } from '../api'

export default function Karyawan() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { getKaryawan().then(r => setRows(r.data || [])).catch(e => setError(e.message)) }, [])
  return <main style={{ padding: 16 }}>
    <h2>Karyawan</h2>
    <button onClick={() => navigate('/tambah')} style={{ padding: 10, border: 0, borderRadius: 9, background: 'var(--accent)', color: 'white', fontWeight: 700 }}>+ Tambah Karyawan</button>
    <input aria-label="Cari karyawan" placeholder="Cari nama karyawan..." value={query} onChange={e => setQuery(e.target.value)} style={{ display: 'block', boxSizing: 'border-box', width: '100%', margin: '15px 0', padding: 12, borderRadius: 9, background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
    {error && <p style={{ color: 'var(--red)' }}>{error}</p>}
    {rows.filter(k => k.nama.toLowerCase().includes(query.toLowerCase())).map(k => <button type="button" key={k.id} onClick={() => navigate(`/dashboard/${k.id}`)} style={{ width: '100%', textAlign: 'left', marginBottom: 8, display: 'flex', justifyContent: 'space-between', gap: 9, padding: 13, borderRadius: 11, background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer' }}>
      <span><strong>{k.nama}</strong><div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{k.jabatan?.nama || 'Karyawan'} · {k.shift?.nama || 'Shift'}</div></span>
      <span style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{rupiah((k.jabatan?.gaji_pokok || 0) + (k.jabatan?.tunjangan || 0))} ›</span>
    </button>)}
  </main>
}
