import { createContext, useContext, useState } from 'react'

const AdminCtx = createContext(null)

export function AdminProvider({ children }) {
  // PIN disimpan di localStorage agar persisten
  const [pin, setPin]         = useState(() => localStorage.getItem('hrd_pin') || '1234')
  const [isAdmin, setIsAdmin] = useState(false)

  function unlock(inputPin) {
    if (inputPin === pin) { setIsAdmin(true); return true }
    return false
  }

  function lock() { setIsAdmin(false) }

  function changePin(oldPin, newPin) {
    if (oldPin !== pin) return false
    setPin(newPin)
    localStorage.setItem('hrd_pin', newPin)
    return true
  }

  return (
    <AdminCtx.Provider value={{ isAdmin, unlock, lock, changePin }}>
      {children}
    </AdminCtx.Provider>
  )
}

export const useAdmin = () => useContext(AdminCtx)