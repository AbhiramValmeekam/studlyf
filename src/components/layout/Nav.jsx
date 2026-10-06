import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../lib/queries'
import { ECOSYSTEMS, ECOSYSTEM_KEYS, ecosystemFromPath, isBuilderSharedPath, lastEcosystem } from '../../lib/ecosystems'
import { track, trackEcosystemClick } from '../../lib/analytics'
import { Button, ArrowIcon } from '../ui/Button'
import { Avatar } from '../ui/atoms'
import { ThemeToggle } from '../ui/ThemeToggle'
import { Menu, MenuItem } from '../ui/navbar-menu'
import { EASE } from '../../lib/motion'
import { JoinModal } from '../ecosystem/JoinModal'
import { NotificationBell } from './NotificationBell'

// Public nav stays minimal — Explore / For You / Resources + Login / Join. The ecosystem cards on
// the homepage are the main entry points; Explore lists the five public ecosystem pages.
// Signed in, the centre nav follows the ecosystem you're in: builder menus in the builder
// experience, nothing extra inside the other products (their tab bar is the navigation).

const EXPLORE_ITEMS = ECOSYSTEM_KEYS.map((k) => ({ to: ECOSYSTEMS[k].landing, title: ECOSYSTEMS[k].plural, desc: ECOSYSTEMS[k].blurb, key: k }))
// "For You": jump to your ecosystem's spotlight on the homepage.
const FOR_YOU_ITEMS = [
  { to: '/#for-builders', title: 'I’m a student / builder', desc: 'Projects, opportunities and proof of work.' },
  { to: '/#for-founders', title: 'I’m a founder', desc: 'Startup workspace, readiness and investors.' },
  { to: '/#for-investors', title: 'I’m an investor', desc: 'Verified access to founders and startups.' },
  { to: '/#for-hr-orgs', title: 'I hire or run programs', desc: 'HR & talent, hackathons and challenges.' },
  { to: '/#opportunities', title: 'Open opportunities', desc: 'Hackathons, internships and challenges open now.' },
]

const LEARN_ITEMS = [
  { to: '/courses', title: 'Courses', desc: 'Role-focused tracks for engineering readiness.' },
  { to: '/studhub', title: 'STUDHub', desc: 'Perks, tools and benefits for your growth.' },
  { to: '/ott', title: 'STUD OTT', desc: 'Talks, series and short courses — with your place saved.' },
  { to: '/resources', title: 'Resources', desc: 'Guides, templates and reference material.' },
]
const JOBPREP_ITEMS = [
  { to: '/resume-builder', title: 'Resume Builder', desc: 'Create tailored resumes in minutes.' },
  { to: '/mock-drills', title: 'Mock Tests & Interviews', desc: 'Practise under real conditions.' },
  { to: '/project-briefs', title: 'Build A Project', desc: 'Ship industry-grade projects with a team.' },
  { to: '/portfolio-builder', title: 'Build Portfolio', desc: 'Showcase your work as a public profile.' },
]
const BUILDER_MENUS = [
  { id: 'learn', label: 'Learn', items: LEARN_ITEMS },
  { id: 'jobprep', label: 'Job Prep', items: JOBPREP_ITEMS },
]
const BUILDER_LINKS = [
  { label: 'Dashboard', to: '/builders/dashboard' },
  { label: 'Opportunities', to: '/opportunities' },
  { label: 'Community', to: '/community' },
]

/** Which ecosystem the signed-in chrome should reflect right now. */
function useContextEcosystem() {
  const { pathname } = useLocation()
  const { user, isBuilder } = useAuth()
  const fromPath = ecosystemFromPath(pathname)
  // Onboarding / verification pages sit under the ecosystem's prefix, but its product nav only
  // appears once access is actually active.
  if (fromPath) return user?.ecosystems?.[fromPath]?.active ? fromPath : null
  if (isBuilderSharedPath(pathname) && isBuilder) return 'BUILDER'
  const last = lastEcosystem()
  return last && user?.ecosystems?.[last]?.active ? last : null
}

function DropdownLinks({ items, onPick }) {
  return (
    <div className="flex w-[280px] flex-col">
      {items.map((it) => (
        <Link key={it.to} to={it.to} onClick={() => onPick?.(it)} className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-line/[0.06]">
          <span className="block text-sm font-semibold text-bone">{it.title}</span>
          <span className="mt-0.5 block text-xs leading-snug text-mute">{it.desc}</span>
        </Link>
      ))}
    </div>
  )
}

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false) // mobile drawer
  const [mobileMenu, setMobileMenu] = useState(null)
  const [active, setActive] = useState(null)
  const [joinOpen, setJoinOpen] = useState(false)
  const { isAuthed, user, logout, isAdmin } = useAuth()
  const location = useLocation()
  const ctx = useContextEcosystem()

  const { data: notif } = useNotifications({ pageSize: 12 }, isAuthed)
  const unread = notif?.meta?.unreadCount ?? 0
  const builderCtx = ctx === 'BUILDER'
  // The "complete your profile" nudge is a builder thing (college, branch, links).
  const profileIncomplete = isAuthed && builderCtx && !user?.admin && user?.completion && !user.completion.isComplete

  // Login is universal — no role travels in the URL. Signing in from an ecosystem landing
  // page still lands the person on the right dashboard: the server's primary ecosystem decides.
  const loginHref = '/login'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
    setActive(null)
    setMobileMenu(null)
  }, [location.pathname])

  const openJoin = () => {
    track('signup_started', { source: 'nav_join' })
    setOpen(false)
    setJoinOpen(true)
  }
  const pickEcosystem = (it) => it.key && trackEcosystemClick(it.key, 'nav_explore')

  // Centre nav model: menus (dropdowns) + plain links, by context.
  const menus = !isAuthed
    ? [
        { id: 'explore', label: 'Explore', items: EXPLORE_ITEMS },
        { id: 'foryou', label: 'For You', items: FOR_YOU_ITEMS },
      ]
    : builderCtx
      ? BUILDER_MENUS
      : ctx
        ? []
        : [{ id: 'explore', label: 'Explore', items: EXPLORE_ITEMS }]
  const links = !isAuthed
    ? [{ label: 'Resources', to: '/#insights' }]
    : builderCtx
      ? BUILDER_LINKS
      : []

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <motion.div
        initial={false}
        animate={{ paddingTop: scrolled ? 10 : 20, paddingBottom: scrolled ? 10 : 20 }}
        transition={{ duration: 0.4, ease: EASE }}
        className={`transition-colors duration-500 ${scrolled ? 'glass border-b border-line/8' : 'border-b border-transparent'}`}
      >
        <div className="wrap flex items-center justify-between gap-4">
          <Link to={isAuthed ? '/go' : '/'} className="display-face text-2xl leading-none tracking-crush">
            STUDLYF<span className="text-acid">.</span>
          </Link>

          {(menus.length > 0 || links.length > 0) && (
            <div className="hidden lg:block">
              <Menu setActive={setActive}>
                {menus.map((m) => (
                  <MenuItem key={m.id} setActive={setActive} active={active} item={m.label}>
                    <DropdownLinks items={m.items} onPick={pickEcosystem} />
                  </MenuItem>
                ))}
                {links.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end
                    onMouseEnter={() => setActive(null)}
                    // In-page anchors (/#insights) are never the "current page".
                    className={({ isActive }) => `text-sm transition-colors ${isActive && !l.to.includes('#') ? 'text-bone' : 'text-mute hover:text-bone'}`}
                  >
                    {l.label}
                  </NavLink>
                ))}
              </Menu>
            </div>
          )}

          <div className="hidden items-center gap-3 lg:flex">
            {isAuthed ? (
              <>
                {isAdmin && (
                  <Link to="/admin" className="rounded-full px-3 py-1.5 text-sm text-mute hover:text-bone">
                    Admin
                  </Link>
                )}
                <ThemeToggle />
                <NotificationBell items={notif?.items ?? []} unread={unread} />
                <Link to="/saved" className="rounded-full px-3 py-1.5 text-sm text-mute hover:text-bone">
                  Saved
                </Link>
                <Link
                  to="/account"
                  aria-label={profileIncomplete ? 'My account — profile incomplete' : 'My account'}
                  title={profileIncomplete ? `Profile ${user.completion.score}% complete — finish it` : 'My account'}
                  className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 hover:bg-line/[0.06]"
                >
                  <span className="relative">
                    <Avatar src={user?.profilePhoto?.url} name={user?.name} size={32} />
                    {profileIncomplete && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-ink" aria-hidden />}
                  </span>
                  <span className="text-sm text-bone">{user?.name?.split(' ')[0]}</span>
                </Link>
                <button onClick={logout} className="whitespace-nowrap text-sm text-mute hover:text-bone">
                  Log out
                </button>
              </>
            ) : (
              <>
                <ThemeToggle />
                <Link to={loginHref} onClick={() => track('login_started', { source: 'nav' })} className="rounded-full px-4 py-2 text-sm text-mute hover:text-bone">
                  Log in
                </Link>
                <Button size="sm" magnetic={false} onClick={openJoin}>
                  Join STUDLYF <ArrowIcon />
                </Button>
              </>
            )}
          </div>

          <button className="flex h-10 w-10 items-center justify-center lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu" aria-expanded={open}>
            <div className="space-y-1.5">
              <motion.span animate={{ rotate: open ? 45 : 0, y: open ? 6 : 0 }} className="block h-0.5 w-6 bg-bone" />
              <motion.span animate={{ opacity: open ? 0 : 1 }} className="block h-0.5 w-6 bg-bone" />
              <motion.span animate={{ rotate: open ? -45 : 0, y: open ? -6 : 0 }} className="block h-0.5 w-6 bg-bone" />
            </div>
          </button>
        </div>
      </motion.div>

      {/* Mobile drawer — tap targets only, no hover dependency */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="glass max-h-[calc(100svh-4rem)] overflow-y-auto border-b border-line/10 lg:hidden"
            data-lenis-prevent
          >
            <nav className="wrap flex flex-col gap-1 py-6">
              {menus.map((m) => (
                <div key={m.id} className="overflow-hidden rounded-xl">
                  <button
                    onClick={() => setMobileMenu(mobileMenu === m.id ? null : m.id)}
                    aria-expanded={mobileMenu === m.id}
                    className="flex w-full items-center justify-between px-4 py-3 text-lg text-bone hover:bg-line/[0.06]"
                  >
                    {m.label}
                    <motion.svg animate={{ rotate: mobileMenu === m.id ? 180 : 0 }} className="h-4 w-4 text-mute" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M19 9l-7 7-7-7" />
                    </motion.svg>
                  </button>
                  <AnimatePresence>
                    {mobileMenu === m.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pl-3">
                        {m.items.map((it) => (
                          <Link key={it.to} to={it.to} onClick={() => pickEcosystem(it)} className="block rounded-lg px-4 py-2.5 text-base text-mute hover:bg-line/[0.06] hover:text-bone">
                            {it.title}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
              {links.map((l) => (
                <Link key={l.to} to={l.to} className="rounded-xl px-4 py-3 text-lg text-bone hover:bg-line/[0.06]">
                  {l.label}
                </Link>
              ))}

              <div className="mt-4 flex flex-col gap-3 border-t border-line/10 pt-5">
                {isAuthed ? (
                  <>
                    <Link to="/account" className="px-4 text-bone">
                      {user?.name}
                      {profileIncomplete && <span className="ml-2 text-sm text-amber-300">· Complete your profile ({user.completion.score}%)</span>}
                    </Link>
                    {isAdmin && <Link to="/admin" className="px-4 text-mute hover:text-bone">Admin</Link>}
                    <Link to="/notifications" className="px-4 text-mute hover:text-bone">
                      Notifications{unread > 0 ? ` (${unread})` : ''}
                    </Link>
                    <Link to="/saved" className="px-4 text-mute hover:text-bone">Saved</Link>
                    <div className="flex items-center gap-3 px-4 pt-1">
                      <ThemeToggle />
                      <span className="text-sm text-mute">Theme</span>
                    </div>
                    <button onClick={logout} className="px-4 text-left text-mute hover:text-bone">Log out</button>
                  </>
                ) : (
                  <>
                    <Button to={loginHref} variant="outline" magnetic={false}>Log in</Button>
                    <Button magnetic={false} onClick={openJoin}>Join STUDLYF</Button>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{joinOpen && <JoinModal onClose={() => setJoinOpen(false)} />}</AnimatePresence>
    </header>
  )
}
