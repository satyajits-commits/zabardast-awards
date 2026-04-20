import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const DEFAULT_CREDS = [
  { label: 'Manager', user: 'manager1', pass: 'manager@123', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { label: 'HOD',     user: 'hod1',     pass: 'hod@123',     color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { label: 'Admin',   user: 'admin1',   pass: 'admin@123',   color: 'bg-orange-50 border-orange-200 text-[#E8520A]' },
]

function defaultForRole(role) {
  if (role === 'manager') return '/nominations'
  if (role === 'hod') return '/hod-review'
  return '/dashboard'
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username.trim() || !password) { setError('Please enter username and password'); return }
    setError(''); setLoading(true)
    try {
      const user = await login(username, password)
      navigate(defaultForRole(user.role), { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  function quickFill(user, pass) { setUsername(user); setPassword(pass); setError('') }

  return (
    <div className="min-h-screen bg-[#FDF8F4] flex flex-col items-center justify-center p-4">
      {/* Card */}
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#E8520A] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-md">🏆</div>
          <h1 className="text-3xl font-bold text-[#E8520A]">Zabardast Awards</h1>
          <p className="text-gray-500 mt-1 text-sm">NoPaperForms Recognition Initiative</p>
          <p className="text-xs text-gray-400 mt-1 italic">"Koshish Kar, Hal Niklega"</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Sign In</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="form-input"
                placeholder="Enter your username"
                autoFocus
                autoComplete="username"
              />
            </div>
            <div>
              <label className="form-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="form-input"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2 py-3 text-base">
              {loading ? (
                <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in…</>
              ) : 'Sign In →'}
            </button>
          </form>

          {/* Quick fill */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center mb-3 font-medium">Quick fill demo credentials</p>
            <div className="grid grid-cols-3 gap-2">
              {DEFAULT_CREDS.map(c => (
                <button
                  key={c.label}
                  onClick={() => quickFill(c.user, c.pass)}
                  className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-colors hover:shadow-sm ${c.color}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Q4 2025-26 · R&amp;D Team Recognition Platform
        </p>
      </div>
    </div>
  )
}
