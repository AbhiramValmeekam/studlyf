import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { meta } from '../data/studlyf'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/primitives'
import { Field, Input } from '../components/ui/forms'
import { ThemeToggle } from '../components/ui/ThemeToggle'

const PORTALS = {
  investor: {
    title: 'Investor Portal',
    blurb: 'Verified investors only. Access is granted by STUDLYF after credential review.',
    steps: ['Approach STUDLYF', 'Verification', 'Credentials issued', 'Login'],
    home: '/investor',
    accent: 'var(--acid)',
  },
  hr: {
    title: 'Talent Platform',
    blurb: 'Paid organizational access. Your workspace is provisioned after verification.',
    steps: ['Approach STUDLYF', 'Org verification', 'Credentials issued', 'Login'],
    home: '/hr',
    accent: 'var(--acid)',
  },
}

/**
 * PortalLogin — the gated login for Investor & HR. Represents the controlled-
 * access flow (verification → credentials → login) without a real backend:
 * any input signs you in and routes to the portal dashboard.
 */
export default function PortalLogin({ portal }) {
  const cfg = PORTALS[portal]
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')

  const submit = (e) => {
    e.preventDefault()
    login(portal)
    navigate(cfg.home)
  }

  return (
    <div className="min-h-screen bg-ink text-bone grid lg:grid-cols-2 relative">
      <div className="absolute top-6 right-6 z-10"><ThemeToggle /></div>
      {/* left — the access story */}
      <div className="hidden lg:flex flex-col justify-between p-12 border-r border-bone/10 bg-ink2/50">
        <Link to="/" data-cursor><img src={meta.logo} alt="STUDLYF" className="h-7 w-auto" /></Link>
        <div>
          <p className="eyebrow text-acid mb-4">Controlled access</p>
          <h1 className="font-display d-2 text-bone tracking-crush mb-6">{cfg.title}</h1>
          <ol className="space-y-4">
            {cfg.steps.map((s, i) => (
              <li key={s} className="flex items-center gap-3 text-bone2">
                <span className="grid place-items-center h-7 w-7 rounded-full bg-acid/15 text-acid text-xs font-display">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </div>
        <p className="text-xs text-bone2/60 max-w-sm">{cfg.blurb}</p>
      </div>

      {/* right — the (fake) login */}
      <div className="grid place-items-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm">
          <Link to="/login" className="text-sm text-bone2 hover:text-bone transition-colors lg:hidden" data-cursor="hover">← All portals</Link>
          <h2 className="font-display text-3xl text-bone tracking-crush mt-4 mb-2">Sign in</h2>
          <p className="text-sm text-bone2 mb-8">Enter your STUDLYF-issued credentials.</p>

          <div className="space-y-4">
            <Field label="Work email" required>
              <Input type="email" placeholder="you@fund.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="Access code" hint="Prototype — any value works">
              <Input type="password" placeholder="••••••••" />
            </Field>
          </div>

          <Button as="button" type="submit" size="lg" className="w-full mt-7">
            Enter {cfg.title} ↗
          </Button>
          <p className="text-center text-xs text-bone2/60 mt-5">
            Not verified yet? <Link to="/login" className="text-acid" data-cursor="hover">Request access</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
