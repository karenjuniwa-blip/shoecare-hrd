import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Topbar          from './components/Topbar'
import BottomNav        from './components/BottomNav'
import Absen            from './pages/Absen'
import Dashboard        from './pages/Dashboard'
import DetailKaryawan   from './pages/DetailKaryawan'
import TambahKaryawan   from './pages/TambahKaryawan'
import Pasang           from './pages/Pasang'
import Pengaturan       from './pages/Pengaturan'

export default function App() {
  return (
    <BrowserRouter>
      <div style={{paddingBottom:70,maxWidth:420,margin:'0 auto',minHeight:'100vh',background:'var(--bg)'}}>
        <Topbar />
        <Routes>
          <Route path="/"                element={<Navigate to="/absen"/>}/>
          <Route path="/absen"           element={<Absen/>}/>
          <Route path="/dashboard"       element={<Dashboard/>}/>
          <Route path="/dashboard/:id"   element={<DetailKaryawan/>}/>
          <Route path="/tambah"          element={<TambahKaryawan/>}/>
          <Route path="/pasang"          element={<Pasang/>}/>
          <Route path="/pengaturan"      element={<Pengaturan/>}/>
        </Routes>
      </div>
      <BottomNav />
    </BrowserRouter>
  )
}