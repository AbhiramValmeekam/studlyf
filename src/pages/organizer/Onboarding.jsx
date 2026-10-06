import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { track } from '../../lib/analytics'
import { useSeo } from '../../lib/seo'
import { ORGANIZATION_TYPES } from '../../lib/enums'
import { AccessStatus } from '../../components/ecosystem/AccessStatus'
import { LoadingBlock, Notice, ProductPage, QueryState, label } from '../../components/ecosystem/product'
import { Area, Choice, SaveRow, Text, clean, useForm } from '../../components/ecosystem/forms'

const EMPTY = { name: '', type: null, website: '', city: '', contactEmail: '', description: '' }

export function useMyOrganization() {
  return useQuery({ queryKey: ['organization', 'mine'], queryFn: () => api.myOrganization().then((r) => r.data) })
}

/** The caller's role inside their organization (OWNER/ADMIN/ORGANIZER/EVALUATOR/VIEWER). */
export function useOrgRole() {
  const { user } = useAuth()
  const role = user?.ecosystems?.ORGANIZER?.organization?.role ?? null
  return {
    role,
    canManagePrograms: ['OWNER', 'ADMIN', 'ORGANIZER'].includes(role),
    canManageMembers: ['OWNER', 'ADMIN'].includes(role),
  }
}

function OrgForm({ initial, submitLabel, onSaved, create }) {
  const qc = useQueryClient()
  const { refresh } = useAuth()
  const form = useForm(initial)
  const submit = (e) => {
    e.preventDefault()
    form.run(async (v) => {
      const body = clean(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, v[k]])))
      const { data } = create ? await api.createOrganization(body) : await api.updateOrganization(body)
      qc.setQueryData(['organization', 'mine'], data)
      await refresh()
      onSaved?.(data)
    }, onSaved ? null : 'Organization saved.')
  }
  return (
    <form onSubmit={submit} className="card-surface space-y-5 p-6 md:p-8" noValidate>
      <div className="grid gap-5 md:grid-cols-2">
        <Text form={form} path="name" label="Organization name" required />
        <Choice form={form} path="type" label="Type" options={ORGANIZATION_TYPES} />
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <Text form={form} path="contactEmail" label="Contact email" type="email" required />
        <Text form={form} path="website" label="Website" type="url" />
        <Text form={form} path="city" label="City" />
      </div>
      <Area form={form} path="description" label="About the organization" rows={4} hint="What you do and the kinds of programs you run." />
      <SaveRow form={form}>{submitLabel}</SaveRow>
    </form>
  )
}

/** /organizations/onboarding — create the organization, then follow its verification. */
export default function OrganizationOnboarding() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user } = useAuth()
  const q = useMyOrganization()
  useSeo({ title: 'Create an organization | STUDLYF', description: 'Create and verify your organization on STUDLYF.', path: '/organizations/onboarding' })
  if (q.isLoading) return <div className="wrap pt-40"><LoadingBlock /></div>
  const org = q.data
  if (org && !params.get('edit')) {
    const status = user?.ecosystems?.ORGANIZER?.status ?? org.status
    return (
      <AccessStatus
        ecosystem="ORGANIZER"
        request={{ ...org, status }}
        what={`Organization verification · ${org.name}`}
        editHref={['OWNER', 'ADMIN'].includes(org.membership?.role) ? '/organizations/onboarding?edit=1' : null}
      >
        <p className="mt-6 text-sm text-mute">
          {label(org.type)} · {org.city || 'City not set'} · {org.contactEmail} · your role: {label(org.membership?.role)}
        </p>
      </AccessStatus>
    )
  }
  return (
    <div className="wrap max-w-4xl pb-24 pt-32 md:pt-40">
      <p className="eyebrow mb-4 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-300" /> Organization onboarding
      </p>
      <h1 className="display-face text-balance text-[clamp(2.2rem,5.5vw,4rem)] leading-[0.98] tracking-tight">{org ? 'Update your organization.' : 'Create your organization.'}</h1>
      <p className="mt-4 max-w-xl text-mute">You’ll be its owner. The STUDLYF team verifies every organization before its programs go live — you can invite your team once it’s verified.</p>
      <div className="mt-10">
        <OrgForm
          create={!org}
          initial={org ? { ...EMPTY, ...org } : EMPTY}
          submitLabel={org?.status === 'REJECTED' ? 'Resubmit for verification' : org ? 'Save' : 'Create organization'}
          onSaved={() => {
            track('onboarding_completed', { ecosystem: 'ORGANIZER', status: 'PENDING' })
            navigate('/organizations/onboarding', { replace: true })
          }}
        />
      </div>
    </div>
  )
}

export function OrganizationProfile() {
  const q = useMyOrganization()
  const { canManageMembers } = useOrgRole()
  return (
    <ProductPage eco="ORGANIZER" title="Organization profile" subtitle="Shown on every opportunity you publish.">
      <QueryState query={q}>
        {q.data &&
          (canManageMembers ? (
            <OrgForm initial={{ ...EMPTY, ...q.data }} submitLabel="Save organization" />
          ) : (
            <Notice>Only owners and admins can edit the organization profile. Your role: {label(q.data.membership?.role)}.</Notice>
          ))}
      </QueryState>
    </ProductPage>
  )
}
