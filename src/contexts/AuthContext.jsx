import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

// Demo credentials — used as fallback when Supabase is not configured
const DEMO_USERS = [
  { id: 'demo-1', username: 'manager1', password_hash: 'manager@123', role: 'manager', display_name: 'Rajesh Gupta',  email: 'manager1@company.com' },
  { id: 'demo-2', username: 'hod1',     password_hash: 'hod@123',     role: 'hod',     display_name: 'Priya Sharma',  email: 'hod1@company.com'     },
  { id: 'demo-3', username: 'admin1',   password_hash: 'admin@123',   role: 'admin',   display_name: 'Amit Singh',    email: 'admin1@company.com'   },
]

const DEMO_SETTINGS = {
  quarter: 'Q4 2025-26',
  company_name: 'NoPaperForms',
  tagline: 'Koshish Kar, Hal Niklega. Aaj Nahi toh Kal Niklega',
  nomination_start_date: '2026-01-01',
  nomination_end_date:   '2026-04-25',
  hod_review_start_date: '2026-04-20',
  hod_review_end_date:   '2026-05-16',
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('za_user')) } catch { return null }
  })
  const [settings, setSettings] = useState({})
  const [settingsLoading, setSettingsLoading] = useState(true)

  const loadSettings = useCallback(async () => {
    const supabaseConfigured =
      import.meta.env.VITE_SUPABASE_URL &&
      !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')

    if (supabaseConfigured) {
      try {
        const { data, error } = await supabase.from('app_settings').select('key, value')
        if (!error && data && data.length > 0) {
          const map = {}
          data.forEach(r => { map[r.key] = r.value })
          setSettings(map)
          setSettingsLoading(false)
          return
        }
      } catch (_) {}
    }

    // Not configured or failed — use demo defaults immediately
    setSettings(DEMO_SETTINGS)
    setSettingsLoading(false)
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  async function login(username, password) {
    const supabaseConfigured =
      import.meta.env.VITE_SUPABASE_URL &&
      !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')

    let matched = null

    if (supabaseConfigured) {
      // Try Supabase only when properly configured
      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('id, username, password_hash, role, display_name, email')
          .eq('username', username.trim())
          .single()
        if (!error && data) matched = data
      } catch (_) {}
    }

    // Fall back to demo users if Supabase not available / not configured
    if (!matched) {
      matched = DEMO_USERS.find(u => u.username === username.trim()) || null
    }

    if (!matched) throw new Error('Invalid username or password')
    if (matched.password_hash !== password) throw new Error('Invalid username or password')

    const userData = {
      id: matched.id,
      username: matched.username,
      role: matched.role,
      display_name: matched.display_name || matched.username,
      email: matched.email || '',
    }
    localStorage.setItem('za_user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }

  function logout() {
    localStorage.removeItem('za_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, settings, settingsLoading, login, logout, refreshSettings: loadSettings }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
