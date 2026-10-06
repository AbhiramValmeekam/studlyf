import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { track } from '../../lib/analytics'
import { useSeo } from '../../lib/seo'
import { Button, ArrowIcon } from '../../components/ui/Button'
import { Notice } from '../../components/ecosystem/product'
import { Spinner } from '../../components/ui/atoms'
import { Reveal, RevealGroup, RevealItem } from '../../components/ui/Reveal'
import { EASE } from '../../lib/motion'

const STEPS = ['Create your builder profile', 'Find an opportunity', 'Join or create a team', 'Build and submit your project', 'Get evaluated and earn achievements', 'Get discovered by hiring teams']

/**
 * /builders/onboarding — how an existing account (say, a founder or HR user) joins the Builder
 * ecosystem. Joining is self-service and adds Builder to the SAME account.
 */
export default function BuilderOnboarding() {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useSeo({ title: 'Join as a builder | STUDLYF', description: 'Add the Builder ecosystem to your STUDLYF account.', path: '/builders/onboarding' })

  const state = user?.ecosystems?.BUILDER
  if (state?.active) return <Navigate to={state.onboarded ? '/builders/dashboard' : '/builders/profile'} replace />

  const join = async () => {
    setBusy(true)
    setError('')
    try {
      await api.setOnboarding({ intent: 'BUILDER' })
      track('onboarding_started', { ecosystem: 'BUILDER' })
      await refresh()
      navigate('/builders/profile', { replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="wrap max-w-3xl pb-24 pt-32 md:pt-40">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
        <p className="eyebrow mb-4 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-acid" /> Builder ecosystem
        </p>
        <h1 className="display-face text-balance text-[clamp(2.4rem,6vw,4.4rem)] leading-[0.95] tracking-tight">Start building on STUDLYF.</h1>
        <p className="mt-4 max-w-xl text-mute">Add the Builder ecosystem to your account — your other ecosystems stay exactly as they are, and you can switch between them any time.</p>
      </motion.div>
      <RevealGroup as="ol" gap={0.06} delay={0.15} className="mt-10 grid gap-2 sm:grid-cols-2">
        {STEPS.map((s, i) => (
          <RevealItem
            as="li"
            key={s}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="group flex items-center gap-3 rounded-xl border border-line/12 px-4 py-3 text-sm transition-colors hover:border-acid/40"
          >
            <span className="font-mono text-xs text-acid transition-transform group-hover:scale-110">{String(i + 1).padStart(2, '0')}</span>
            <span className="text-bone">{s}</span>
          </RevealItem>
        ))}
      </RevealGroup>
      {error && <div className="mt-6"><Notice tone="error">{error}</Notice></div>}
      <Reveal delay={0.3} className="mt-10">
        <Button onClick={join} disabled={busy} magnetic={false} size="lg">
          {busy ? <Spinner className="h-5 w-5" /> : <>Join as a Builder <ArrowIcon /></>}
        </Button>
      </Reveal>
    </div>
  )
}
