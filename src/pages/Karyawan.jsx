import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getKaryawan } from '../api'

export default function Karyawan() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    getKaryawan().then(r => setRows(r.data || [])).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [])
  const filtered = rows.filter(k => (k.nama || '').toLowerCase().includes(query.toLowerCase()))
  return <main className="sf-page sf-employees">
    <div className="sf-page-heading sf-heading-row">
      <h2>Karyawan</h2>
      <button type="button" className="sf-button sf-button-small" onClick={() => navigate('/tambah')}>+ Tambah</button>
    </div>
    <input className="sf-field sf-search" aria-label="Cari karyawan" placeholder="Cari nama karyawan" value={query} onChange={e => setQuery(e.target.value)} />
    {error && <p role="alert" className="sf-error">{error}</p>}
    {loading && <p className="sf-muted">Memuat karyawan...</p>}
    <div className="sf-employee-list">
      {filtered.map(k => <button className="sf-employee-row" type="button" key={k.id} onClick={() => navigate(`/dashboard/${k.id}`)}>
        <span className="sf-employee-avatar">{(k.nama || '?').split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase()}</span>
        <span className="sf-employee-details"><strong>{k.nama}</strong><small>{k.jabatan?.nama || 'Karyawan'} · {k.shift?.nama || 'Shift belum diatur'}</small></span>
        <span className="sf-employee-chevron" aria-hidden="true">›</span>
      </button>)}
      {!loading && !error && !filtered.length && <p className="sf-muted">Tidak ada karyawan yang cocok.</p>}
    </div>
  </main>
}
