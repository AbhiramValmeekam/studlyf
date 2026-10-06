import { Navigate, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { track } from '../../lib/analytics'
import { useSeo } from '../../lib/seo'
import { STARTUP_STAGES, STARTUP_TYPES } from '../../lib/enums'
import { Choice, SaveRow, Text, Area, clean, useForm } from '../../components/ecosystem/forms'

/**
 * Founder onboarding: founder profile + "create your startup" in one step. Submitting grants the
 * Founder ecosystem on the SAME account (no second login), then continues to the workspace.
 */
export default function FounderOnboarding() {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  useSeo({ title: 'Founder onboarding | STUDLYF', description: 'Create your founder and startup profile.', path: '/founders/onboarding' })
  const form = useForm({ headline: '', location: user?.profile?.city ?? '', startup: { name: '', oneLiner: '', industry: '', stage: null, type: null } })

  // Already a founder → dashboard (but not mid-submit, when we're about to open the workspace).
  if (user?.ecosystems?.FOUNDER?.active && !form.busy) return <Navigate to="/founders/dashboard" replace />

  const submit = (e) => {
    e.preventDefault()
    form.run(async (v) => {
      const { data } = await api.createFounderProfile(clean(v))
      qc.setQueryData(['founder', 'profile'], data)
      track('onboarding_completed', { ecosystem: 'FOUNDER' })
      await refresh()
      navigate('/founders/workspace?welcome=1', { replace: true })
    }, null)
  }

  return (
    <div className="wrap max-w-3xl pb-24 pt-32 md:pt-40">
      <p className="eyebrow mb-4 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-violet" /> Founder onboarding · step 1 of 1
      </p>
      <h1 className="display-face text-balance text-[clamp(2.4rem,6vw,4.4rem)] leading-[0.95] tracking-tight">Create your startup.</h1>
      <p className="mt-4 max-w-xl text-mute">
        The basics now — you’ll build out the workspace (market, competitors, business model, GTM, pitch) next. {user?.ecosystems?.BUILDER?.active && 'Your builder profile stays exactly as it is.'}
      </p>
      <form onSubmit={submit} className="card-surface mt-10 space-y-5 p-6 md:p-8" noValidate>
        <div className="grid gap-5 md:grid-cols-2">
          <Text form={form} path="startup.name" label="Startup name" required />
          <Text form={form} path="startup.industry" label="Industry" placeholder="e.g. AgriTech, EdTech, FinTech" />
        </div>
        <Area form={form} path="startup.oneLiner" label="One-liner" rows={2} hint="What you do, for whom — in one sentence." required />
        <div className="grid gap-5 md:grid-cols-2">
          <Choice form={form} path="startup.stage" label="Stage" options={STARTUP_STAGES} />
          <Choice form={form} path="startup.type" label="Startup type" options={STARTUP_TYPES} />
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Text form={form} path="headline" label="Your founder headline" placeholder="e.g. Second-time founder in climate" />
          <Text form={form} path="location" label="Location" />
        </div>
        <SaveRow form={form}>Create founder profile</SaveRow>
      </form>
    </div>
  )
}
