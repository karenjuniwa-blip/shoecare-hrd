import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate
} from 'react-router-dom'

import Topbar from './components/Topbar'
import BottomNav from './components/BottomNav'
import PinLock from './components/PinLock'

import Absen from './pages/Absen'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Karyawan from './pages/Karyawan'
import DetailKaryawan from './pages/DetailKaryawan'
import TambahKaryawan from './pages/TambahKaryawan'
import Pasang from './pages/Pasang'
import Jadwal from './pages/Jadwal'
import Keuangan from './pages/Keuangan'
import KoreksiAbsen from './pages/KoreksiAbsen'
import Pengaturan from './pages/Pengaturan'

import { useAdmin } from './hooks/useAdmin'

function AdminRoute({ children }) {
  const { isAdmin } = useAdmin()
  const navigate = useNavigate()

  if (isAdmin) {
    return children
  }

  return (
    <PinLock
      onCancel={() => navigate('/absen', { replace: true })}
    />
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div
        style={{
          paddingBottom: 70,
          maxWidth: 420,
          margin: '0 auto',
          minHeight: '100vh',
          background: 'var(--bg)'
        }}
      >
        <Topbar />

        <Routes>
          <Route
            path="/"
            element={<Navigate to="/absen" replace />}
          />

          <Route path="/absen" element={<Absen />} />

          <Route
            path="/home"
            element={<AdminRoute><Home /></AdminRoute>}
          />

          <Route
            path="/dashboard"
            element={<AdminRoute><Dashboard /></AdminRoute>}
          />

          <Route
            path="/karyawan"
            element={<AdminRoute><Karyawan /></AdminRoute>}
          />

          <Route
            path="/dashboard/:id"
            element={<AdminRoute><DetailKaryawan /></AdminRoute>}
          />

          <Route
            path="/tambah"
            element={<AdminRoute><TambahKaryawan /></AdminRoute>}
          />

          <Route
            path="/pasang"
            element={<AdminRoute><Pasang /></AdminRoute>}
          />

          <Route
            path="/jadwal"
            element={<AdminRoute><Jadwal /></AdminRoute>}
          />

          <Route
            path="/keuangan"
            element={<AdminRoute><Keuangan /></AdminRoute>}
          />

          <Route
            path="/koreksi-absen"
            element={<AdminRoute><KoreksiAbsen /></AdminRoute>}
          />

          <Route
            path="/pengaturan"
            element={<AdminRoute><Pengaturan /></AdminRoute>}
          />

          <Route
            path="*"
            element={<Navigate to="/absen" replace />}
          />
        </Routes>
      </div>

      <BottomNav />
    </BrowserRouter>
  )
}