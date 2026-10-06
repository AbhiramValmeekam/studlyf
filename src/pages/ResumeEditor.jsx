import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../lib/api'
import { useResume } from '../lib/queries'
import { PageHeader } from '../components/layout/PageHeader'
import { Button, ArrowIcon } from '../components/ui/Button'
import { Input, Textarea, FormField } from '../components/ui/Field'
import { Spinner, ErrorState } from '../components/ui/atoms'
import { ResumePreview } from '../components/resume/ResumePreview'
import { TemplatePicker } from '../components/resume/TemplatePicker'

const TEMPLATE_IDS = ['classic', 'modern', 'minimal', 'technical']

const LINK_KEYS = ['github', 'linkedin', 'portfolio', 'website']
const LINK_LABELS = { github: 'GitHub', linkedin: 'LinkedIn', portfolio: 'Portfolio', website: 'Website' }

const emptyExperience = { company: '', role: '', location: '', startDate: '', endDate: '', current: false, description: '' }
const emptyEducation = { school: '', program: '', year: '', details: '' }
const emptyProject = { name: '', description: '', url: '', skills: '' }
const emptyCertification = { name: '', issuer: '', year: '' }

const emptyForm = {
  title: '',
  template: 'classic',
  fullName: '',
  headline: '',
  email: '',
  phone: '',
  location: '',
  links: { github: '', linkedin: '', portfolio: '', website: '' },
  summary: '',
  experience: [],
  education: [],
  projects: [],
  skills: '',
  certifications: [],
}

const clean = (v) => {
  const t = (v ?? '').trim()
  return t === '' ? null : t
}
const splitList = (s) =>
  (s || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

// A row is "empty" (and dropped from the payload) when none of its fields carry text.
const isEmptyRow = (obj) =>
  Object.entries(obj).every(([k, v]) => (k === 'current' ? v === false : (v ?? '').toString().trim() === ''))

// <<APPEND_EDITOR>>

export default function ResumeEditor() {
  const { id } = useParams()
  const editing = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const { data: existing, isLoading, isError, refetch } = useResume(editing ? id : undefined)

  const initialTemplate = TEMPLATE_IDS.includes(searchParams.get('template')) ? searchParams.get('template') : 'classic'
  const [form, setForm] = useState({ ...emptyForm, template: initialTemplate })
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    if (!existing) return
    setForm({
      title: existing.title || '',
      template: TEMPLATE_IDS.includes(existing.template) ? existing.template : 'classic',
      fullName: existing.fullName || '',
      headline: existing.headline || '',
      email: existing.email || '',
      phone: existing.phone || '',
      location: existing.location || '',
      links: {
        github: existing.links?.github || '',
        linkedin: existing.links?.linkedin || '',
        portfolio: existing.links?.portfolio || '',
        website: existing.links?.website || '',
      },
      summary: existing.summary || '',
      experience: (existing.experience || []).map((e) => ({ ...emptyExperience, ...e, current: !!e.current })),
      education: (existing.education || []).map((e) => ({ ...emptyEducation, ...e })),
      projects: (existing.projects || []).map((p) => ({
        ...emptyProject,
        ...p,
        skills: (p.skills || []).join(', '),
      })),
      skills: (existing.skills || []).join(', '),
      certifications: (existing.certifications || []).map((c) => ({ ...emptyCertification, ...c })),
    })
  }, [existing])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setLink = (k) => (e) => setForm((f) => ({ ...f, links: { ...f.links, [k]: e.target.value } }))
  const setTemplate = (id) => setForm((f) => ({ ...f, template: id }))

  // Generic helpers for the repeatable sections.
  const addRow = (key, blank) => () => setForm((f) => ({ ...f, [key]: [...f[key], { ...blank }] }))
  const removeRow = (key, i) => () => setForm((f) => ({ ...f, [key]: f[key].filter((_, idx) => idx !== i) }))
  const setRow = (key, i, field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [key]: f[key].map((row, idx) => (idx === i ? { ...row, [field]: value } : row)) }))
  }

  const buildPayload = () => ({
    title: form.title.trim(),
    template: form.template,
    fullName: clean(form.fullName),
    headline: clean(form.headline),
    email: clean(form.email),
    phone: clean(form.phone),
    location: clean(form.location),
    links: Object.fromEntries(LINK_KEYS.map((k) => [k, clean(form.links[k])])),
    summary: clean(form.summary),
    experience: form.experience
      .filter((r) => !isEmptyRow(r))
      .map((r) => ({
        company: r.company.trim(),
        role: r.role.trim(),
        location: clean(r.location),
        startDate: clean(r.startDate),
        endDate: clean(r.endDate),
        current: !!r.current,
        description: clean(r.description),
      })),
    education: form.education
      .filter((r) => !isEmptyRow(r))
      .map((r) => ({ school: r.school.trim(), program: clean(r.program), year: clean(r.year), details: clean(r.details) })),
    projects: form.projects
      .filter((r) => !isEmptyRow(r))
      .map((r) => ({ name: r.name.trim(), description: clean(r.description), url: clean(r.url), skills: splitList(r.skills) })),
    skills: splitList(form.skills),
    certifications: form.certifications
      .filter((r) => !isEmptyRow(r))
      .map((r) => ({ name: r.name.trim(), issuer: clean(r.issuer), year: clean(r.year) })),
  })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    setFormError(null)
    try {
      const payload = buildPayload()
      const { data } = editing ? await api.updateResume(id, payload) : await api.createResume(payload)
      qc.invalidateQueries({ queryKey: ['resumes'] })
      if (editing) qc.invalidateQueries({ queryKey: ['resume', id] })
      navigate('/resume-builder')
      return data
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) {
        const top = {}
        const nested = []
        for (const d of err.details) {
          if (d.field && !d.field.includes('.')) top[d.field] = d.message
          else nested.push(`${d.field}: ${d.message}`)
        }
        setErrors(top)
        if (nested.length) setFormError(nested.join(' · '))
      } else if (err instanceof ApiError) {
        setFormError(err.message)
      }
    } finally {
      setBusy(false)
    }
  }

  if (editing && isLoading) {
    return (
      <div className="grid min-h-[60svh] place-items-center">
        <Spinner className="h-7 w-7 text-acid" />
      </div>
    )
  }
  if (editing && isError) {
    return (
      <div className="wrap py-24">
        <ErrorState onRetry={refetch} />
      </div>
    )
  }

  // <<APPEND_EDITOR_JSX>>
  return (
    <>
      <PageHeader
        eyebrow={editing ? 'Edit resume' : 'New resume'}
        title={editing ? 'Edit your resume' : 'Build a resume'}
        subtitle="Fill in what’s relevant — every section is optional except the title. Your resume stays private to you."
      />

      <div className="wrap py-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:items-start">
          <form onSubmit={submit} className="space-y-10 lg:min-w-0">
            {formError && (
              <div className="rounded-xl border border-flare/30 bg-flare/[0.06] px-4 py-3 text-sm text-flare">
                {formError}
              </div>
            )}

            {/* Template */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold tracking-tight text-bone">Template</h2>
              <TemplatePicker value={form.template} onChange={setTemplate} />
            </section>

          {/* Basics */}
          <section className="space-y-6">
            <FormField label="Resume title" htmlFor="title" error={errors.title} hint="An internal label, e.g. “Frontend Engineer”.">
              <Input id="title" value={form.title} onChange={set('title')} placeholder="Frontend Engineer" />
            </FormField>
            <div className="grid gap-6 sm:grid-cols-2">
              <FormField label="Full name" htmlFor="fullName" error={errors.fullName}>
                <Input id="fullName" value={form.fullName} onChange={set('fullName')} placeholder="Ada Lovelace" />
              </FormField>
              <FormField label="Headline" htmlFor="headline" error={errors.headline}>
                <Input id="headline" value={form.headline} onChange={set('headline')} placeholder="Full-stack engineer" />
              </FormField>
              <FormField label="Email" htmlFor="email" error={errors.email}>
                <Input id="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
              </FormField>
              <FormField label="Phone" htmlFor="phone" error={errors.phone}>
                <Input id="phone" value={form.phone} onChange={set('phone')} placeholder="+1 555 0100" />
              </FormField>
              <FormField label="Location" htmlFor="location" error={errors.location}>
                <Input id="location" value={form.location} onChange={set('location')} placeholder="Bengaluru, India" />
              </FormField>
            </div>
          </section>

          {/* Links */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight text-bone">Links</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {LINK_KEYS.map((k) => (
                <FormField key={k} label={LINK_LABELS[k]} htmlFor={k} error={errors.links}>
                  <Input id={k} value={form.links[k]} onChange={setLink(k)} placeholder="https://…" />
                </FormField>
              ))}
            </div>
          </section>

          {/* Summary + skills */}
          <section className="space-y-6">
            <FormField label="Summary" htmlFor="summary" error={errors.summary} hint="Two or three sentences on who you are.">
              <Textarea id="summary" value={form.summary} onChange={set('summary')} rows={4} placeholder="Backend engineer with a love for correctness…" />
            </FormField>
            <FormField label="Skills" htmlFor="skills" error={errors.skills} hint="Comma-separated.">
              <Input id="skills" value={form.skills} onChange={set('skills')} placeholder="React, Node.js, PostgreSQL" />
            </FormField>
          </section>

          {/* <<APPEND_SECTIONS>> */}

          {/* Experience */}
          <RepeatSection title="Experience" rows={form.experience} addLabel="Add role" onAdd={addRow('experience', emptyExperience)}>
            {form.experience.map((r, i) => (
              <RowCard key={i} onRemove={removeRow('experience', i)}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Company"><Input value={r.company} onChange={setRow('experience', i, 'company')} placeholder="Analytical Engines" /></FormField>
                  <FormField label="Role"><Input value={r.role} onChange={setRow('experience', i, 'role')} placeholder="Software Engineer" /></FormField>
                  <FormField label="Location"><Input value={r.location} onChange={setRow('experience', i, 'location')} placeholder="Remote" /></FormField>
                  <FormField label="Dates">
                    <div className="flex items-center gap-2">
                      <Input value={r.startDate} onChange={setRow('experience', i, 'startDate')} placeholder="Jun 2024" />
                      <span className="text-mute">–</span>
                      <Input value={r.endDate} onChange={setRow('experience', i, 'endDate')} placeholder="Present" disabled={r.current} />
                    </div>
                  </FormField>
                </div>
                <label className="flex items-center gap-2 text-sm text-bone/90">
                  <input type="checkbox" checked={r.current} onChange={setRow('experience', i, 'current')} className="h-4 w-4 rounded border-line/30 bg-ink2 text-acid" />
                  I currently work here
                </label>
                <FormField label="Description">
                  <Textarea value={r.description} onChange={setRow('experience', i, 'description')} rows={3} placeholder="What you did and the impact you had." />
                </FormField>
              </RowCard>
            ))}
          </RepeatSection>

          {/* Education */}
          <RepeatSection title="Education" rows={form.education} addLabel="Add education" onAdd={addRow('education', emptyEducation)}>
            {form.education.map((r, i) => (
              <RowCard key={i} onRemove={removeRow('education', i)}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="School"><Input value={r.school} onChange={setRow('education', i, 'school')} placeholder="Vertex Institute" /></FormField>
                  <FormField label="Program"><Input value={r.program} onChange={setRow('education', i, 'program')} placeholder="B.Tech Computer Science" /></FormField>
                  <FormField label="Year"><Input value={r.year} onChange={setRow('education', i, 'year')} placeholder="2026" /></FormField>
                </div>
                <FormField label="Details"><Textarea value={r.details} onChange={setRow('education', i, 'details')} rows={2} placeholder="Honours, coursework, GPA…" /></FormField>
              </RowCard>
            ))}
          </RepeatSection>

          {/* <<APPEND_SECTIONS_2>> */}

          {/* Projects */}
          <RepeatSection title="Projects" rows={form.projects} addLabel="Add project" onAdd={addRow('projects', emptyProject)}>
            {form.projects.map((r, i) => (
              <RowCard key={i} onRemove={removeRow('projects', i)}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Name"><Input value={r.name} onChange={setRow('projects', i, 'name')} placeholder="Real-time Chat App" /></FormField>
                  <FormField label="URL"><Input value={r.url} onChange={setRow('projects', i, 'url')} placeholder="https://…" /></FormField>
                </div>
                <FormField label="Description"><Textarea value={r.description} onChange={setRow('projects', i, 'description')} rows={2} placeholder="What it does and how you built it." /></FormField>
                <FormField label="Skills" hint="Comma-separated."><Input value={r.skills} onChange={setRow('projects', i, 'skills')} placeholder="Node.js, React" /></FormField>
              </RowCard>
            ))}
          </RepeatSection>

          {/* Certifications */}
          <RepeatSection title="Certifications" rows={form.certifications} addLabel="Add certification" onAdd={addRow('certifications', emptyCertification)}>
            {form.certifications.map((r, i) => (
              <RowCard key={i} onRemove={removeRow('certifications', i)}>
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField label="Name"><Input value={r.name} onChange={setRow('certifications', i, 'name')} placeholder="AWS Cloud Practitioner" /></FormField>
                  <FormField label="Issuer"><Input value={r.issuer} onChange={setRow('certifications', i, 'issuer')} placeholder="Amazon Web Services" /></FormField>
                  <FormField label="Year"><Input value={r.year} onChange={setRow('certifications', i, 'year')} placeholder="2025" /></FormField>
                </div>
              </RowCard>
            ))}
          </RepeatSection>

          <div className="flex items-center gap-4 border-t border-line/10 pt-6">
            <Button type="submit" magnetic={false} disabled={busy}>
              {busy ? <Spinner className="h-5 w-5" /> : editing ? 'Save changes' : <>Create resume <ArrowIcon /></>}
            </Button>
            <button type="button" onClick={() => navigate('/resume-builder')} className="text-sm text-mute hover:text-bone">
              Cancel
            </button>
          </div>
          </form>

          <aside className="lg:sticky lg:top-24">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mute">Live preview</span>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-lg border border-line/20 px-3 py-1.5 text-xs font-semibold text-bone/90 transition hover:border-acid/50 hover:text-bone"
              >
                Download PDF
              </button>
            </div>
            <div className="rounded-2xl border border-line/10 bg-line/[0.03] p-3">
              <ResumePreview resume={form} id="resume-print-target" />
            </div>
            <p className="mt-2 text-[11px] text-mute/70">“Download PDF” opens your browser’s print dialog — choose “Save as PDF”.</p>
          </aside>
        </div>
      </div>
    </>
  )
}

// Wrapper for a repeatable section (experience/education/projects/certifications).
function RepeatSection({ title, rows, onAdd, addLabel, children }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-bone">{title}</h2>
        <button type="button" onClick={onAdd} className="text-sm text-acid hover:text-bone">
          + {addLabel}
        </button>
      </div>
      {!rows.length ? (
        <p className="text-sm text-mute/70">Nothing added yet.</p>
      ) : (
        <div className="space-y-5">{children}</div>
      )}
    </section>
  )
}

function RowCard({ onRemove, children }) {
  return (
    <div className="card-surface space-y-4 p-5">
      <div className="flex justify-end">
        <button type="button" onClick={onRemove} className="text-sm text-mute hover:text-flare">
          Remove
        </button>
      </div>
      {children}
    </div>
  )
}

