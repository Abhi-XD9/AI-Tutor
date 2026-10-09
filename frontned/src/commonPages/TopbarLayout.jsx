import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import axios from 'axios'
import logo from '../assets/logo11.png'

const LogoutModal = ({ open, onCancel, onConfirm }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.28)] sm:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-rose-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-900">Confirm logout</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">Are you sure you want to log out? Your current session will be removed.</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={onConfirm} className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700">Logout</button>
        </div>
      </div>
    </div>
  )
}

const navItems = [
  {
    label: 'Dashboard', path: '/dashboard',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: 'Subjects', path: '/subjects',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
]

const TopbarLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [profile, setProfile] = useState({})
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => { fetchProfile() }, [])

  useEffect(() => {
    const el = document.getElementById('main-scroll')
    if (!el) return
    const onScroll = () => setScrolled(el.scrollTop > 10)
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const fetchProfile = async () => {
    try {
      const token = Cookies.get('token')
      const resp = await axios.get('api/V1/users/profile/', { headers: { Authorization: `Bearer ${token}` } })
      if (resp.status === 200) setProfile(resp.data.profile)
    } catch {}
  }

  const handleLogout = () => {
    Cookies.remove('token')
    delete axios.defaults.headers.common.Authorization
    setLogoutOpen(false)
    navigate('/login', { replace: true })
  }

  const initials = `${profile?.first_name?.charAt(0) ?? ''}${profile?.last_name?.charAt(0) ?? ''}`

  return (
    <>
      <main className="h-screen overflow-hidden" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #f5f9fd 50%, #edf4fb 100%)' }}>
        <div className="flex h-full w-full flex-col">

          {/* ── Topbar ── */}
          <header className={`relative z-30 px-5 py-3 transition-all duration-300 ${
            scrolled
              ? 'border-b border-white/40 bg-white/70 shadow-[0_8px_32px_rgba(31,38,135,0.10)] backdrop-blur-2xl'
              : 'border-b border-white/20 bg-white/30 backdrop-blur-xl'
          }`}>
            <div className="flex items-center justify-between gap-4">

              {/* Logo */}
              <div className="flex shrink-0 items-center gap-3">
                <img src={logo} alt="logo" className="h-9 object-contain" />
              </div>

              {/* Nav pills */}
              <nav className="hidden md:flex items-center gap-1 rounded-2xl border border-white/50 bg-white/40 px-1.5 py-1.5 shadow-[0_4px_24px_rgba(31,38,135,0.08)] backdrop-blur-md">
                {navItems.map((item) => {
                  const active = location.pathname.startsWith(item.path)
                  return (
                    <a
                      key={item.path}
                      href={item.path}
                      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                        active
                          ? 'bg-[#1d7bff] text-white shadow-[0_4px_14px_rgba(29,123,255,0.35)]'
                          : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                      }`}
                    >
                      <span className={active ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                      {item.label}
                    </a>
                  )
                })}
              </nav>

              {/* Right side */}
              <div className="flex items-center gap-2">

                {/* Profile chip */}
                <div className="hidden sm:flex items-center gap-2.5 rounded-2xl border border-white/50 bg-white/50 px-3 py-2 shadow-sm backdrop-blur-md">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1d7bff] to-[#7c3aed] text-[11px] font-bold text-white">
                    {initials || '?'}
                  </div>
                  <div className="hidden lg:block">
                    <p className="text-xs font-semibold leading-none text-slate-900">{profile?.first_name} {profile?.last_name}</p>
                    <p className="mt-0.5 text-[10px] leading-none text-slate-400">{profile?.email}</p>
                  </div>
                </div>

                {/* Logout */}
                <button
                  type="button"
                  onClick={() => setLogoutOpen(true)}
                  className="flex items-center gap-2 rounded-2xl border border-rose-200/60 bg-rose-50/80 px-3.5 py-2 text-sm font-semibold text-rose-600 backdrop-blur-sm transition hover:bg-rose-100 hover:text-rose-700"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>

            {/* Mobile nav */}
            <div className="md:hidden mt-2.5 flex items-center gap-1 rounded-2xl border border-white/40 bg-white/30 px-1.5 py-1.5 backdrop-blur-md">
              {navItems.map((item) => {
                const active = location.pathname.startsWith(item.path)
                return (
                  <a
                    key={item.path}
                    href={item.path}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                      active ? 'bg-[#1d7bff] text-white shadow-md' : 'text-slate-600 hover:bg-white/50'
                    }`}
                  >
                    {item.icon}{item.label}
                  </a>
                )
              })}
            </div>
          </header>

          {/* Content */}
          <div id="main-scroll" className="flex-1 overflow-y-auto">
            <Outlet />
          </div>
        </div>
      </main>

      <LogoutModal open={logoutOpen} onCancel={() => setLogoutOpen(false)} onConfirm={handleLogout} />
    </>
  )
}

export default TopbarLayout
