import { Link, useNavigate } from 'react-router-dom'
import { meta } from '../data/studlyf'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/primitives'
import { ThemeToggle } from '../components/ui/ThemeToggle'

const ROLES = [
  { role: 'builder', to: '/builder', label: 'Builder', desc: 'Discover opportunities, build projects, get discovered.', accent: 'var(--acid)' },
  { role: 'founder', to: '/startup', label: 'Founder', desc: 'Shape your startup, sharpen readiness, meet investors.', accent: 'var(--violet)' },
  { role: 'investor', to: '/investor', label: 'Investor', desc: 'Verified access to discover and connect with founders.', accent: 'var(--acid)', gated: true },
  { role: 'hr', to: '/hr', label: 'Organization / HR', desc: 'Paid access to discover builders by real evidence.', accent: 'var(--acid)', gated: true },
  { role: 'organizer', to: '/organizer', label: 'Organizer', desc: 'Run hackathons, workshops and evaluations.', accent: 'var(--flare)' },
]

/**
 * LoginHub — the single entry point that fans out to each ecosystem. Fake auth:
 * choosing a role signs you in and drops you into that product. Gated portals
 * (Investor/HR) route through their own verification-styled login.
 */
export default function LoginHub() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const enter = (r) => {
    if (r.gated) {
      navigate(`/${r.role}/login`)
      return
    }
    login(r.role)
    navigate(r.to)
  }

  return (
    <div className="min-h-screen bg-ink text-bone flex flex-col">
      <header className="gutter h-20 flex items-center justify-between">
        <Link to="/" data-cursor><img src={meta.logo} alt="STUDLYF" className="h-7 w-auto" /></Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link to="/" className="text-sm text-bone2 hover:text-bone transition-colors" data-cursor="hover">← Back to site</Link>
        </div>
      </header>

      <div className="flex-1 gutter grid place-items-center py-16">
        <div className="w-full max-w-4xl">
          <p className="eyebrow text-acid mb-4">Enter the ecosystem</p>
          <h1 className="font-display d-1 text-bone tracking-crush mb-3">Choose your path.</h1>
          <p className="text-bone2 max-w-xl mb-10">
            One STUDLYF, five ways in. This is a prototype — pick any path to explore its full journey. No password needed.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {ROLES.map((r) => (
              <button
                key={r.role}
                onClick={() => enter(r)}
                data-cursor="hover"
                className="group text-left rounded-2xl border border-bone/12 bg-ink2/70 p-6 transition-colors hover:border-acid/40"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.accent }} />
                  {r.gated && <span className="text-[10px] uppercase tracking-widest text-bone2">Verified access</span>}
                </div>
                <h2 className="font-display text-2xl text-bone tracking-crush">{r.label}</h2>
                <p className="text-sm text-bone2 mt-2">{r.desc}</p>
                <span className="inline-flex items-center gap-1 text-sm mt-4 text-acid group-hover:gap-2 transition-all">
                  Enter ↗
                </span>
              </button>
            ))}
          </div>

          <p className="text-xs text-bone2/60 mt-8">
            Prototype note: authentication is simulated. Investor and HR are shown as gated portals to reflect their controlled/paid access.
          </p>
        </div>
      </div>
    </div>
  )
}
