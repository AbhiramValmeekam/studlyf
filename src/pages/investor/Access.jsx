import { Navigate, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { track } from '../../lib/analytics'
import { useSeo } from '../../lib/seo'
import { FUNDING_STAGES, INVESTOR_TYPES, STARTUP_TYPES } from '../../lib/enums'
import { AccessStatus } from '../../components/ecosystem/AccessStatus'
import { LoadingBlock, ProductPage, QueryState } from '../../components/ecosystem/product'
import { Area, Choice, ListField, MultiChoice, SaveRow, Text, clean, useForm } from '../../components/ecosystem/forms'

const EMPTY = { firmName: '', title: '', investorType: null, website: '', linkedin: '', stages: [], sectors: [], geographies: [], startupTypes: [], checkSize: '', thesis: '' }

function useInvestorRequest() {
  return useQuery({ queryKey: ['investor', 'request'], queryFn: () => api.investorRequest().then((r) => r.data) })
}

function RequestForm({ initial, submitLabel, onSaved }) {
  const qc = useQueryClient()
  const { refresh } = useAuth()
  const form = useForm(initial)
  const submit = (e) => {
    e.preventDefault()
    form.run(async (v) => {
      // Only the editable fields — status and review fields are never sent from the client.
      const body = clean(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, v[k]])))
      const { data } = await api.submitInvestorRequest(body)
      qc.setQueryData(['investor', 'request'], data)
      await refresh()
      onSaved?.(data)
    }, onSaved ? null : 'Preferences saved.')
  }
  return (
    <form onSubmit={submit} className="card-surface space-y-5 p-6 md:p-8" noValidate>
      <div className="grid gap-5 md:grid-cols-2">
        <Text form={form} path="firmName" label="Firm or fund name" hint="Angels: “Independent angel” is fine." required />
        <Text form={form} path="title" label="Your title" />
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <Choice form={form} path="investorType" label="Investor type" options={INVESTOR_TYPES} />
        <Text form={form} path="website" label="Website" type="url" />
        <Text form={form} path="linkedin" label="LinkedIn" type="url" />
      </div>
      <h2 className="pt-2 text-lg font-semibold text-bone">Investment preferences</h2>
      <MultiChoice form={form} path="stages" label="Stages" options={FUNDING_STAGES} />
      <MultiChoice form={form} path="startupTypes" label="Startup types" options={STARTUP_TYPES} />
      <div className="grid gap-5 md:grid-cols-2">
        <ListField form={form} path="sectors" label="Industries" hint="e.g. AgriTech, Climate, EdTech" />
        <ListField form={form} path="geographies" label="Geographies" hint="e.g. India, Southeast Asia" />
      </div>
      <Text form={form} path="checkSize" label="Ticket size" placeholder="e.g. ₹25L – ₹1.5Cr" />
      <Area form={form} path="thesis" label="Thesis" rows={4} />
      <SaveRow form={form}>{submitLabel}</SaveRow>
    </form>
  )
}

/** /investors/access-request — the request form (new, pending or rejected). */
export default function InvestorAccessRequest() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const q = useInvestorRequest()
  useSeo({ title: 'Request investor access | STUDLYF', description: 'Request verified investor access on STUDLYF.', path: '/investors/access-request' })
  if (user?.ecosystems?.INVESTOR?.status === 'ACTIVE') return <Navigate to="/investors/preferences" replace />
  if (user?.ecosystems?.INVESTOR?.status === 'SUSPENDED') return <Navigate to="/investors/access-request/status" replace />
  const existing = q.data
  return (
    <div className="wrap max-w-4xl pb-24 pt-32 md:pt-40">
      <p className="eyebrow mb-4 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-flare" /> Investor access · verification required
      </p>
      <h1 className="display-face text-balance text-[clamp(2.2rem,5.5vw,4rem)] leading-[0.98] tracking-tight">
        {existing ? 'Update your access request.' : 'Request investor access.'}
      </h1>
      <p className="mt-4 max-w-xl text-mute">Tell us who you are and what you invest in. The STUDLYF team verifies every investor before any founder data is visible.</p>
      <div className="mt-10">
        {q.isLoading ? (
          <LoadingBlock />
        ) : (
          <RequestForm
            initial={existing ? { ...EMPTY, ...existing } : EMPTY}
            submitLabel={existing?.status === 'REJECTED' ? 'Resubmit for review' : existing ? 'Save request' : 'Submit for verification'}
            onSaved={() => {
              track('onboarding_completed', { ecosystem: 'INVESTOR', status: 'PENDING' })
              navigate('/investors/access-request/status', { replace: true })
            }}
          />
        )}
      </div>
    </div>
  )
}

export function InvestorAccessStatus() {
  const { user } = useAuth()
  const q = useInvestorRequest()
  useSeo({ title: 'Investor access status | STUDLYF', description: 'Your investor access request status.', path: '/investors/access-request/status' })
  if (q.isLoading) return <div className="wrap pt-40"><LoadingBlock /></div>
  const request = q.data ? { ...q.data, status: user?.ecosystems?.INVESTOR?.status ?? q.data.status } : null
  return <AccessStatus ecosystem="INVESTOR" request={request} what="Investor access" editHref="/investors/access-request" />
}

/** /investors/preferences — verified investors edit their profile + investment preferences. */
export function InvestorPreferences() {
  const q = useInvestorRequest()
  return (
    <ProductPage eco="INVESTOR" title="Investor profile & preferences" subtitle="Your preferences drive Intelligence and the “matches your preferences” count. Editing them never affects your verification.">
      <QueryState query={q}>{q.data && <RequestForm initial={{ ...EMPTY, ...q.data }} submitLabel="Save preferences" />}</QueryState>
    </ProductPage>
  )
}
