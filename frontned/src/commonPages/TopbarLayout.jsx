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
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-sm font-bold text-rose-600">
            OUT
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-900">
              Confirm logout
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Are you sure you want to log out of your account? Your current session token will be removed.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}

const TopbarLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [profile, setProfile] = useState({})
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

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
      const resp = await axios.get('api/V1/users/profile/', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (resp.status === 200) {
        setProfile(resp.data.profile)
      }
    } catch (error) {
      console.log(error)
    }
  }

  const handleLogout = () => {
    Cookies.remove('token')
    delete axios.defaults.headers.common.Authorization
    setLogoutOpen(false)
    navigate('/login', { replace: true })
  }

  const navItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Subjects', path: '/subjects' },
  ]

  return (
    <>
      <main className="h-screen overflow-hidden bg-[linear-gradient(180deg,#f5f9fd_0%,#edf4fb_100%)]">
        <div className="flex h-full w-full flex-col">
          {/* Topbar */}
          <header className={`px-6 py-4 transition-all duration-300 ${
            scrolled
              ? 'border-b border-white/30 bg-white/60 backdrop-blur-xl shadow-lg'
              : 'border-b border-transparent bg-transparent'
          }`}>
            <div className="flex items-center justify-between gap-6">
              {/* Logo - Left */}
              <div className="flex-shrink-0">
                <img src={logo} alt="logo" className="h-10 object-cover" />
              </div>

              {/* Navigation - Center with Glassmorphism */}
              <nav className="hidden md:flex items-center gap-1 rounded-full border border-white/40 bg-white/20 px-2 py-1.5 shadow-[0_8px_32px_rgba(31,38,135,0.12)] backdrop-blur-md">
                {navItems.map((item) => (
                  <a
                    key={item.path}
                    href={item.path}
                    className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                      location.pathname === item.path
                        ? 'bg-[#1d7bff] text-white shadow-lg shadow-blue-200'
                        : 'text-slate-600 hover:text-[#1d7bff] hover:bg-white/40'
                    }`}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>

              {/* Profile & Logout - Right */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/60 px-3 py-2 backdrop-blur-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1d7bff] text-xs font-bold text-white shrink-0">
                    {profile?.first_name?.charAt(0)}{profile?.last_name?.charAt(0)}
                  </div>
                  <div className="hidden lg:block pr-2">
                    <p className="text-xs font-semibold text-slate-900">{profile?.first_name} {profile?.last_name}</p>
                    <p className="text-[10px] text-slate-500">{profile?.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLogoutOpen(true)}
                  className="rounded-full bg-rose-500/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 backdrop-blur-sm shadow-lg shadow-rose-200"
                >
                  Logout
                </button>
              </div>
            </div>

            {/* Mobile Navigation */}
            <div className="md:hidden mt-3 flex items-center gap-1 rounded-full border border-white/40 bg-white/10 px-2 py-1 backdrop-blur-md">
              {navItems.map((item) => (
                <a
                  key={item.path}
                  href={item.path}
                  className={`flex-1 px-3 py-2 rounded-full text-xs font-semibold text-center transition-all ${
                    location.pathname === item.path
                      ? 'bg-[#1d7bff] text-white shadow-lg shadow-blue-200'
                      : 'text-slate-600 hover:text-[#1d7bff] hover:bg-white/40'
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </header>

          {/* Main Content */}
          <div id="main-scroll" className="flex-1 overflow-y-auto">
            <Outlet />
          </div>
        </div>
      </main>

      <LogoutModal
        open={logoutOpen}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
      />
    </>
  )
}

export default TopbarLayout
