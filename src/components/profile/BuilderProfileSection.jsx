import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useBuilderProfile, useSkills } from '../../lib/queries'
import { Button, ArrowIcon } from '../ui/Button'
import { Input, Textarea, Select, FormField } from '../ui/Field'
import { Chip, Spinner, ErrorState } from '../ui/atoms'
import { titleCase } from '../../lib/format'
import { detailsToErrors } from '../../lib/profile'
import { PORTFOLIO_TEMPLATES } from '../portfolio/registry'

const AVAILABILITIES = ['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'FREELANCE', 'NOT_AVAILABLE']
const PROFICIENCIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']

const TEMPLATE_IDS = PORTFOLIO_TEMPLATES.map((t) => t.id)

function toForm(p, templateOverride) {
  const override = TEMPLATE_IDS.includes(templateOverride) ? templateOverride : null
  return {
    username: p?.username || '',
    headline: p?.headline || '',
    bio: p?.bio || '',
    template: override || p?.template || 'editorial',
    availability: p?.availability || '',
    visibility: p?.visibility || 'PRIVATE',
    education: (p?.education || []).map((e) => ({ school: e.school || '', program: e.program || '', year: e.year || '' })),
  }
}

/** Every builder write can move the unified completion score, so refresh all views of it. */
function useInvalidateProfile() {
  const qc = useQueryClient()
  return () => {
    for (const key of ['me', 'builder-profile', 'builder-completion', 'builder-dashboard']) {
      qc.invalidateQueries({ queryKey: [key] })
    }
  }
}

/**
 * Builder-only part of the profile page: public handle, headline, bio, availability,
 * visibility, additional education and skills. College, city and social links are
 * edited in the shared personal section above (single source of truth).
 */
export function BuilderProfileSection() {
  const { user } = useAuth()
  // Only fetch when /me says a profile exists. Without this the endpoint answers 404 for every
  // builder who hasn't created one yet, and the browser logs that as a console error on each
  // visit even though this hook handles it. getMe derives builderUsername from the BuilderProfile
  // row itself, so "non-null username" and "profile exists" are the same condition.
  const { data: profile, isLoading, isError, refetch } = useBuilderProfile(!!user?.builderUsername)
  const exists = !!profile
  const invalidate = useInvalidateProfile()

  // A layout chosen from the Portfolio Builder gallery arrives as ?template=… and preselects it.
  const [params] = useSearchParams()
  const paramTemplate = params.get('template')

  const [form, setForm] = useState(() => toForm(profile, paramTemplate))
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const [savedAt, setSavedAt] = useState(null)

  useEffect(() => setForm(toForm(profile, paramTemplate)), [profile, paramTemplate])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    const payload = {
      headline: form.headline,
      bio: form.bio,
      template: form.template,
      availability: form.availability || null,
      visibility: form.visibility,
      education: form.education
        .filter((x) => x.school.trim())
        .map((x) => ({ school: x.school.trim(), program: x.program.trim(), year: x.year.trim() })),
    }
    try {
      if (exists) await api.updateBuilderProfile(payload)
      else await api.createBuilderProfile({ ...payload, username: form.username.trim().toLowerCase() })
      invalidate()
      setSavedAt(Date.now())
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) setErrors(detailsToErrors(err))
      else if (err instanceof ApiError) setErrors({ _form: err.message })
    } finally {
      setBusy(false)
    }
  }

  // `!user` matters as much as `isLoading`: until /me resolves we don't know whether a profile
  // exists, and the disabled query reports isLoading=false — without this a builder who has a
  // profile would see the "create" form flash before their real one replaces it.
  if (!user || isLoading) {
    return (
      <div className="card-surface grid place-items-center p-10">
        <Spinner className="h-6 w-6 text-acid" />
      </div>
    )
  }
  if (isError) return <ErrorState onRetry={refetch} />

  return (
    <>
      <form onSubmit={save} className="card-surface space-y-6 p-6 sm:p-8" noValidate>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="display-face text-2xl tracking-tight">{exists ? 'Builder profile' : 'Create your builder profile'}</h2>
            <p className="mt-1 text-sm text-mute">
              {exists
                ? 'How organisers see you — it also powers your recommendations.'
                : 'Pick a public handle to get a shareable portfolio page and application tracking.'}
            </p>
          </div>
          {exists && form.visibility === 'PUBLIC' && (
            <Link to={`/builders/${profile.username}`} className="inline-flex items-center gap-1.5 text-sm text-acid hover:underline">
              View public page <ArrowIcon className="h-4 w-4" />
            </Link>
          )}
        </div>

        {errors._form && (
          <div role="alert" className="rounded-xl border border-flare/30 bg-flare/[0.06] px-4 py-3 text-sm text-flare">
            {errors._form}
          </div>
        )}

        {exists ? (
          <p className="text-sm text-mute">
            Handle: <span className="font-mono text-bone">@{profile.username}</span>
          </p>
        ) : (
          <FormField label="Username" htmlFor="b-username" error={errors.username} hint="Your public handle at /builders/…">
            <Input id="b-username" value={form.username} onChange={set('username')} error={errors.username} placeholder="ada-lovelace" autoCapitalize="off" />
          </FormField>
        )}

        <FormField label="Headline" htmlFor="b-headline" error={errors.headline} hint="One line on what you do.">
          <Input id="b-headline" value={form.headline} onChange={set('headline')} error={errors.headline} placeholder="Full-stack builder & designer" />
        </FormField>

        <FormField label="Bio" htmlFor="b-bio" error={errors.bio} hint="At least 40 characters counts toward your completion.">
          <Textarea id="b-bio" value={form.bio} onChange={set('bio')} rows={5} placeholder="What do you build? What are you looking for?" />
        </FormField>

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField label="Availability" htmlFor="b-availability" error={errors.availability}>
            <Select id="b-availability" value={form.availability} onChange={set('availability')}>
              <option value="">Not specified</option>
              {AVAILABILITIES.map((a) => (
                <option key={a} value={a}>
                  {titleCase(a)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Visibility" htmlFor="b-visibility" hint="Public pages are visible to anyone with the link.">
            <Select id="b-visibility" value={form.visibility} onChange={set('visibility')}>
              <option value="PRIVATE">Private — only you</option>
              <option value="PUBLIC">Public — anyone with the link</option>
            </Select>
          </FormField>
        </div>

        <div>
          <p className="text-sm font-medium text-bone/90">Portfolio template</p>
          <p className="text-xs text-mute">How your public page looks. Change it anytime — your content stays the same.</p>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {PORTFOLIO_TEMPLATES.map((t) => {
              const active = (form.template || 'editorial') === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, template: t.id }))}
                  aria-pressed={active}
                  className={`rounded-xl border p-3 text-left transition ${
                    active ? 'border-acid/60 bg-acid/[0.06]' : 'border-line/12 hover:border-line/25'
                  }`}
                >
                  <span className={`text-sm font-semibold ${active ? 'text-bone' : 'text-bone/85'}`}>{t.name}</span>
                  <span className="mt-1 block text-[11px] leading-snug text-mute/80">{t.sub}</span>
                </button>
              )
            })}
          </div>
        </div>

        <EducationEditor education={form.education} onChange={(education) => setForm((f) => ({ ...f, education }))} />

        <div className="flex items-center gap-4 pt-1">
          <Button type="submit" magnetic={false} disabled={busy}>
            {busy ? <Spinner className="h-5 w-5" /> : exists ? 'Save builder profile' : <>Create builder profile <ArrowIcon /></>}
          </Button>
          {savedAt && <span className="text-sm text-acid" role="status">Saved</span>}
        </div>
      </form>

      {exists && <SkillsSection profile={profile} onSaved={invalidate} />}
    </>
  )
}

function EducationEditor({ education, onChange }) {
  const add = () => onChange([...education, { school: '', program: '', year: '' }])
  const remove = (i) => onChange(education.filter((_, idx) => idx !== i))
  const edit = (i, k, v) => onChange(education.map((e, idx) => (idx === i ? { ...e, [k]: v } : e)))

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-bone/90">Other education</p>
          <p className="text-xs text-mute">School, previous degrees, fellowships — your current college is set above.</p>
        </div>
        <button type="button" onClick={add} className="text-sm text-acid hover:underline">
          + Add
        </button>
      </div>
      {education.length > 0 && (
        <div className="space-y-3">
          {education.map((e, i) => (
            <div key={i} className="grid gap-3 rounded-2xl border border-line/10 p-4 sm:grid-cols-[1fr_1fr_110px_auto]">
              <Input value={e.school} onChange={(ev) => edit(i, 'school', ev.target.value)} placeholder="School / institution" aria-label="School" />
              <Input value={e.program} onChange={(ev) => edit(i, 'program', ev.target.value)} placeholder="Program" aria-label="Program" />
              <Input value={e.year} onChange={(ev) => edit(i, 'year', ev.target.value)} placeholder="Year" aria-label="Year" />
              <button
                type="button"
                onClick={() => remove(i)}
                className="justify-self-start text-sm text-flare hover:underline sm:self-center sm:justify-self-center"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SkillsSection({ profile, onSaved }) {
  const [skills, setSkills] = useState(() =>
    (profile.skills || []).map((s) => ({ slug: s.slug, name: s.name, proficiency: s.proficiency || 'INTERMEDIATE' })),
  )
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [error, setError] = useState(null)
  const { data: vocab } = useSkills(query)

  const chosen = useMemo(() => new Set(skills.map((s) => s.slug)), [skills])
  const suggestions = (vocab || []).filter((s) => !chosen.has(s.slug)).slice(0, 8)

  const add = (s) => {
    setSkills((prev) => [...prev, { slug: s.slug, name: s.name, proficiency: 'INTERMEDIATE' }])
    setQuery('')
  }
  const remove = (slug) => setSkills((prev) => prev.filter((s) => s.slug !== slug))
  const setProf = (slug, proficiency) => setSkills((prev) => prev.map((s) => (s.slug === slug ? { ...s, proficiency } : s)))

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      await api.setBuilderSkills({ skills: skills.map((s) => ({ slug: s.slug, proficiency: s.proficiency })) })
      onSaved?.()
      setSavedAt(Date.now())
    } catch (err) {
      if (err instanceof ApiError) setError(err.details?.[0]?.message || err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section id="skills" className="card-surface mt-6 scroll-mt-28 p-6 sm:p-8">
      <h2 className="display-face text-2xl tracking-tight">Skills</h2>
      <p className="mt-1 text-sm text-mute">Add at least 3 — these drive your opportunity recommendations.</p>

      <div className="mt-6">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search skills — React, Python, UI/UX…" aria-label="Search skills" />
        {query && suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <Chip key={s.slug} onClick={() => add(s)}>
                + {s.name}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {skills.length === 0 ? (
          <p className="text-sm text-mute/70">No skills yet — search above to add some.</p>
        ) : (
          skills.map((s) => (
            <div key={s.slug} className="flex items-center gap-3 rounded-xl border border-line/12 bg-ink2/40 px-4 py-2.5">
              <span className="flex-1 text-sm text-bone">{s.name}</span>
              <Select value={s.proficiency} onChange={(e) => setProf(s.slug, e.target.value)} className="!h-9 !w-auto !py-0 text-sm" aria-label={`${s.name} proficiency`}>
                {PROFICIENCIES.map((p) => (
                  <option key={p} value={p}>
                    {titleCase(p)}
                  </option>
                ))}
              </Select>
              <button type="button" onClick={() => remove(s.slug)} className="text-sm text-flare hover:underline">
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      {error && <p className="mt-4 text-sm text-flare">{error}</p>}
      <div className="mt-6 flex items-center gap-4">
        <Button onClick={save} magnetic={false} disabled={busy}>
          {busy ? <Spinner className="h-5 w-5" /> : 'Save skills'}
        </Button>
        {savedAt && <span className="text-sm text-acid" role="status">Saved</span>}
      </div>
    </section>
  )
}
