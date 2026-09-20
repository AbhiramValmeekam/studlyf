import { useState } from 'react'
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom'
import { meta } from '../../data/studlyf'
import { useAuth } from '../../context/AuthContext'
import { NAV, SWITCHER } from './nav'
import { RouteTransition } from './RouteTransition'
import { Avatar } from '../ui/primitives'
import { ThemeToggle } from '../ui/ThemeToggle'

/**
 * AppShell — the frame every authenticated ecosystem screen renders inside.
 * Left sidebar (brand mark, ecosystem switcher, role-scoped nav), a top bar
 * with the current persona, and an outlet with route transitions.
 *
 * `role` prop pins the shell to a product; falls back to the signed-in role.
 */
export default function AppShell({ role: roleProp }) {
  const { user, role: authRole, logout } = useAuth()
  const navigate = useNavigate()
  const role = roleProp || authRole || 'builder'
  const nav = NAV[role] || NAV.builder
  const [open, setOpen] = useState(false)

  const onLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-ink text-bone flex">
      {/* ---- Sidebar ---- */}
      <aside
        className={`fixed lg:sticky top-0 z-[90] h-screen w-64 shrink-0 bg-ink2/95 backdrop-blur border-r border-bone/10 flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-5 border-b border-bone/10">
          <Link to="/" className="inline-flex items-center gap-2" data-cursor>
            <img src={meta.logo} alt="STUDLYF" className="h-6 w-auto" />
          </Link>
          <p className="mt-3 text-[10px] uppercase tracking-[0.2em]" style={{ color: nav.accent }}>
            {nav.label} Ecosystem
          </p>
        </div>

        {/* ecosystem switcher */}
        <div className="px-3 pt-4">
          <p className="px-2 text-[10px] uppercase tracking-widest text-bone2/60 mb-2">Switch</p>
          <div className="flex flex-wrap gap-1.5 px-1">
            {SWITCHER.map((s) => (
              <Link
                key={s.role}
                to={s.to}
                data-cursor="hover"
                className={`rounded-full px-2.5 py-1 text-[11px] border transition-colors ${
                  s.role === role ? 'bg-acid text-ink border-acid' : 'text-bone2 border-bone/20 hover:border-bone/50'
                }`}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>

        {/* role nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
          {nav.items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              onClick={() => setOpen(false)}
              data-cursor="hover"
              className={({ isActive }) =>
                `block rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  isActive ? 'bg-acid/12 text-bone font-medium' : 'text-bone2 hover:text-bone hover:bg-bone/5'
                }`
              }
            >
              {({ isActive }) => (
                <span className="flex items-center gap-2.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full transition-colors"
                    style={{ background: isActive ? nav.accent : 'transparent', outline: isActive ? 'none' : '1px solid rgb(var(--bone) / 0.2)' }}
                  />
                  {it.label}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={onLogout}
          data-cursor="hover"
          className="m-3 rounded-xl px-3 py-2.5 text-sm text-bone2 hover:text-flare hover:bg-flare/5 transition-colors text-left"
        >
          ← Sign out
        </button>
      </aside>

      {open && <div className="fixed inset-0 z-[85] bg-ink/60 lg:hidden" onClick={() => setOpen(false)} />}

      {/* ---- Main ---- */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-[70] h-16 bg-ink/80 backdrop-blur border-b border-bone/10 flex items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen((v) => !v)} className="lg:hidden p-2 -ml-2" aria-label="Menu" data-cursor>
              <span className="block h-px w-5 bg-bone mb-1.5" />
              <span className="block h-px w-5 bg-bone" />
            </button>
            <span className="text-sm text-bone2 hidden sm:block">STUDLYF · {nav.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="text-right hidden sm:block">
              <p className="text-sm text-bone leading-tight">{user?.name || 'Guest'}</p>
              <p className="text-[11px] text-bone2 leading-tight">{user?.title || 'Preview mode'}</p>
            </div>
            <Avatar name={user?.name || 'Guest'} size={38} />
          </div>
        </header>

        <main className="flex-1 px-5 lg:px-8 py-8 max-w-[1400px] w-full mx-auto">
          <RouteTransition>
            <Outlet />
          </RouteTransition>
        </main>
      </div>
    </div>
  )
}
