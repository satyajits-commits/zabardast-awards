import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NAV = {
  admin:   [{ to: '/dashboard', label: '📊 Dashboard' }, { to: '/download', label: '📥 Download' }, { to: '/settings', label: '⚙️ Settings' }],
  manager: [{ to: '/nominations', label: '📝 Nominations' }],
  hod:     [{ to: '/hod-review',  label: '👔 HOD Review' }],
}

const ROLE_BADGE = {
  manager: 'bg-blue-100 text-blue-700',
  hod:     'bg-purple-100 text-purple-700',
  admin:   'bg-orange-100 text-[#E8520A]',
}

const ROLE_LABEL = { manager: 'Manager', hod: 'HOD', admin: 'Admin' }

export default function Header() {
  const { user, settings, logout } = useAuth()
  const { pathname } = useLocation()

  const links   = NAV[user?.role] || []
  const initials = (user?.display_name || user?.username || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">

          {/* Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-[#E8520A] rounded-xl flex items-center justify-center text-xl shadow-sm">🏆</div>
            <div>
              <div className="text-[17px] font-bold text-[#E8520A] leading-tight">Zabardast Awards</div>
              <div className="text-[11px] text-gray-400 leading-tight">
                {settings.company_name || 'NoPaperForms'} Recognition Initiative
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {links.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  pathname === link.to
                    ? 'bg-[#E8520A] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-orange-50 hover:text-[#E8520A]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-3 shrink-0">
            {settings.quarter && (
              <span className="hidden lg:block text-xs font-bold border-2 border-[#E8520A] text-[#E8520A] px-3 py-1 rounded-full">
                {settings.quarter}
              </span>
            )}
            {settings.nomination_end_date && (
              <div className="hidden lg:block text-right">
                <div className="text-[10px] text-gray-400 font-medium">Deadline</div>
                <div className="text-xs font-semibold text-gray-700">
                  {new Date(settings.nomination_end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            )}

            {/* User avatar */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-[#E8520A] rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm">
                {initials}
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-semibold text-gray-800 leading-tight">{user?.display_name || user?.username}</div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_BADGE[user?.role]}`}>
                  {ROLE_LABEL[user?.role]}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-300 rounded-xl px-3 py-1.5 transition-colors font-medium"
            >
              Logout
            </button>
          </div>

        </div>
      </div>
    </header>
  )
}
