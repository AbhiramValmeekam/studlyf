import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { track } from '../../lib/analytics'
import { useSeo } from '../../lib/seo'
import { AccessStatus } from '../../components/ecosystem/AccessStatus'
import { LoadingBlock, ProductPage, QueryState } from '../../components/ecosystem/product'
import { Area, SaveRow, Text, clean, useForm } from '../../components/ecosystem/forms'

const EMPTY = { companyName: '', designation: '', workEmail: '', companyWebsite: '', linkedin: '', companySize: '', hiringFor: '' }

function useHrRequest() {
  return useQuery({ queryKey: ['hr', 'request'], queryFn: () => api.hrRequest().then((r) => r.data) })
}

function CompanyForm({ initial, submitLabel, onSaved }) {
  const qc = useQueryClient()
  const { refresh } = useAuth()
  const form = useForm(initial)
  const submit = (e) => {
    e.preventDefault()
    form.run(async (v) => {
      const body = clean(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, v[k]])))
      const { data } = await api.submitHrRequest(body)
      qc.setQueryData(['hr', 'request'], data)
      await refresh()
      onSaved?.(data)
    }, onSaved ? null : 'Company details saved.')
  }
  return (
    <form onSubmit={submit} className="card-surface space-y-5 p-6 md:p-8" noValidate>
      <div className="grid gap-5 md:grid-cols-2">
        <Text form={form} path="companyName" label="Company" required />
        <Text form={form} path="designation" label="Your role" placeholder="e.g. Talent Partner" required />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Text form={form} path="workEmail" label="Work email" type="email" hint="Use your company domain — it speeds up verification." required />
        <Text form={form} path="companyWebsite" label="Company website" type="url" />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Text form={form} path="linkedin" label="Your LinkedIn" type="url" />
        <Text form={form} path="companySize" label="Company size" placeholder="e.g. 51-200" />
      </div>
      <Area form={form} path="hiringFor" label="What are you hiring for?" rows={3} />
      <SaveRow form={form}>{submitLabel}</SaveRow>
    </form>
  )
}

/** /hr/verification — request form when there's nothing to show, status page otherwise (?edit=1 to edit). */
export default function HrVerification() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user } = useAuth()
  const q = useHrRequest()
  useSeo({ title: 'HR verification | STUDLYF', description: 'Verify your hiring organization to discover talent on STUDLYF.', path: '/hr/verification' })
  if (q.isLoading) return <div className="wrap pt-40"><LoadingBlock /></div>
  const existing = q.data
  const status = user?.ecosystems?.HR?.status
  if (existing && !params.get('edit')) {
    return <AccessStatus ecosystem="HR" request={{ ...existing, status: status ?? existing.status }} what="HR verification" editHref="/hr/verification?edit=1" />
  }
  return (
    <div className="wrap max-w-4xl pb-24 pt-32 md:pt-40">
      <p className="eyebrow mb-4 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-lime-300" /> HR access · organization verification
      </p>
      <h1 className="display-face text-balance text-[clamp(2.2rem,5.5vw,4rem)] leading-[0.98] tracking-tight">Verify your hiring team.</h1>
      <p className="mt-4 max-w-xl text-mute">Builders only appear to verified hiring teams. Tell us who you hire for — the STUDLYF team confirms it before talent discovery opens.</p>
      <div className="mt-10">
        <CompanyForm
          initial={existing ? { ...EMPTY, ...existing } : EMPTY}
          submitLabel={existing?.status === 'REJECTED' ? 'Resubmit for verification' : existing ? 'Save' : 'Submit for verification'}
          onSaved={() => {
            track('onboarding_completed', { ecosystem: 'HR', status: 'PENDING' })
            navigate('/hr/verification', { replace: true })
          }}
        />
      </div>
    </div>
  )
}

export function HrCompany() {
  const q = useHrRequest()
  return (
    <ProductPage eco="HR" title="HR organization" subtitle="Your verified company details. Candidates see the company name when you invite them.">
      <QueryState query={q}>{q.data && <CompanyForm initial={{ ...EMPTY, ...q.data }} submitLabel="Save company details" />}</QueryState>
    </ProductPage>
  )
}
