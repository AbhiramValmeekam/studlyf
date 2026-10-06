import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { api, ApiError } from '../lib/api'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { Badge, Avatar, Spinner, Tag } from '../components/ui/atoms'
import { BasicFields, EducationFields, InterestsPicker, LinksFields } from '../components/profile/PersonalFields'
import { BuilderProfileSection } from '../components/profile/BuilderProfileSection'
import { titleCase, formatDate } from '../lib/format'
import { MISSING_LABELS, REQUIRED_LABELS, detailsToErrors, personalPayload, toPersonalForm } from '../lib/profile'

const PERSONAL_KEYS = ['name', 'phone', 'gender', 'city', 'college', 'degree', 'branch', 'yearOfStudy', 'graduationYear', 'links', 'interests']

/**
 * The one profile page. Reached from the avatar in the nav (/account) and from the
 * builder journey (/builders/profile) — both render this, so there is exactly one place
 * to see and edit a profile. Personal fields save to /me/profile; builder fields to
 * /builder/profile. Both feed the same completion score shown in the sidebar.
 * Both routes open at the top of the page; the builder section is reached by scrolling.
 */
export default function Account() {
  const { user, isBuilder, logout } = useAuth()

  if (!user) return null

  return (
    <>
      <PageHeader eyebrow="Your profile" title="My profile" subtitle="One profile for everything on STUDLYF — applications, recommendations and your public page." />

      <div className="wrap grid gap-10 py-12 lg:grid-cols-[300px_1fr]">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <IdentityCard user={user} />
        </aside>

        <div className="min-w-0 space-y-6">
          <PersonalProfileForm user={user} />

          <section id="builder" className="scroll-mt-28">
            {isBuilder ? (
              <BuilderProfileSection />
            ) : (
              <div className="card-surface p-6 sm:p-8">
                <h2 className="display-face text-2xl tracking-tight">Builder profile</h2>
                <p className="mt-2 max-w-lg text-sm text-mute">
                  Builders get a public portfolio page, skill-based recommendations and application tracking.
                </p>
                <Button to="/onboarding" variant="outline" size="sm" className="mt-5">
                  Become a builder
                </Button>
              </div>
            )}
          </section>

          <AccountSettings user={user} onLogout={logout} />
        </div>
      </div>
    </>
  )
}

function IdentityCard({ user }) {
  const c = user.completion || { score: 0, missing: [], requiredMissing: [] }
  return (
    <div className="card-surface p-7">
      <div className="flex flex-col items-center text-center">
        <Avatar src={user.profilePhoto?.url} name={user.name} size={80} />
        <p className="mt-5 text-xl font-semibold text-bone">{user.name}</p>
        <p className="text-sm text-mute">{user.email}</p>
        {user.profile?.college && (
          <p className="mt-2 text-sm text-bone/80">
            {[user.profile.degree, user.profile.branch].filter(Boolean).join(', ')}
            <br />
            <span className="text-mute">{user.profile.college}</span>
          </p>
        )}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Badge tone="violet">{titleCase(user.role || 'Member')}</Badge>
          {user.emailVerified ? <Badge tone="open">Verified</Badge> : <Badge tone="soon">Unverified</Badge>}
        </div>
      </div>

      <div className="mt-7 border-t border-line/10 pt-6">
        <div className="flex items-baseline justify-between">
          <p className="eyebrow">Profile strength</p>
          <span className="display-face text-3xl leading-none">{c.score}%</span>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-line/10"
          role="progressbar"
          aria-valuenow={c.score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Profile completion"
        >
          <div className="h-full rounded-full bg-acid transition-all duration-700" style={{ width: `${c.score}%` }} />
        </div>
        {c.requiredMissing?.length > 0 ? (
          <p className="mt-4 text-sm text-amber-300">
            Required: {c.requiredMissing.map((k) => REQUIRED_LABELS[k] || k).join(', ')}
          </p>
        ) : (
          c.missing?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {c.missing.map((m) => (
                <Tag key={m}>{MISSING_LABELS[m] || m}</Tag>
              ))}
            </div>
          )
        )}
      </div>

      {user.builderUsername && (
        <Link to={`/builders/${user.builderUsername}`} className="mt-6 block text-center text-sm text-acid hover:underline">
          @{user.builderUsername}
        </Link>
      )}
      <p className="mt-5 text-center text-xs text-mute">Joined {formatDate(user.createdAt) || '—'}</p>
    </div>
  )
}

function PersonalProfileForm({ user }) {
  const qc = useQueryClient()
  const initial = useMemo(() => toPersonalForm(user), [user])
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [savedAt, setSavedAt] = useState(null)

  // Pick up changes saved elsewhere (the prompt, the builder section) — but never
  // clobber edits the user hasn't saved yet.
  const prevInitial = useRef(initial)
  useEffect(() => {
    setForm((f) => (JSON.stringify(f) === JSON.stringify(prevInitial.current) ? initial : f))
    prevInitial.current = initial
  }, [initial])

  const dirty = JSON.stringify(form) !== JSON.stringify(initial)
  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e))
  }

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    setFormError('')
    try {
      const { data } = await api.updateMyProfile(personalPayload(form, PERSONAL_KEYS))
      // Adopt exactly what the server stored (e.g. "github.com/x" → "https://github.com/x"),
      // so a successful save never leaves the form looking dirty.
      const stored = toPersonalForm(data)
      prevInitial.current = stored
      setForm(stored)
      qc.setQueryData(['me'], data)
      for (const key of ['builder-profile', 'builder-completion', 'builder-dashboard']) qc.invalidateQueries({ queryKey: [key] })
      setSavedAt(Date.now())
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) setErrors(detailsToErrors(err))
      else setFormError(err instanceof ApiError ? err.message : 'Couldn’t save — try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} noValidate className="space-y-6">
      {formError && (
        <div role="alert" className="rounded-xl border border-flare/30 bg-flare/[0.06] px-4 py-3 text-sm text-flare">
          {formError}
        </div>
      )}

      <section id="personal" className="card-surface scroll-mt-28 p-6 sm:p-8">
        <h2 className="display-face mb-6 text-2xl tracking-tight">Personal details</h2>
        <BasicFields form={form} set={set} errors={errors} email={user.email} emailVerified={user.emailVerified} />
      </section>

      <section id="education" className="card-surface scroll-mt-28 p-6 sm:p-8">
        <h2 className="display-face mb-6 text-2xl tracking-tight">Education</h2>
        <EducationFields form={form} set={set} errors={errors} />
      </section>

      <section id="links" className="card-surface scroll-mt-28 p-6 sm:p-8">
        <h2 className="display-face mb-6 text-2xl tracking-tight">Links & goals</h2>
        <div className="space-y-6">
          <LinksFields form={form} set={set} errors={errors} showWebsite />
          <InterestsPicker form={form} set={set} errors={errors} />
        </div>
      </section>

      {/* Sticky save bar so long forms don't hide the action */}
      <div className="sticky bottom-4 z-10 flex items-center gap-4 rounded-2xl border border-line/10 bg-ink2/90 px-5 py-3 backdrop-blur">
        <Button type="submit" magnetic={false} disabled={!dirty || busy}>
          {busy ? <Spinner className="h-5 w-5" /> : 'Save changes'}
        </Button>
        {dirty ? (
          <span className="text-sm text-mute">Unsaved changes</span>
        ) : (
          savedAt && (
            <span className="text-sm text-acid" role="status">
              Saved
            </span>
          )
        )}
      </div>
    </form>
  )
}

function AccountSettings({ user, onLogout }) {
  const [resent, setResent] = useState(false)
  const resend = async () => {
    await api.resendVerification({ email: user.email }).catch(() => {})
    setResent(true)
  }
  return (
    <section className="card-surface p-6 sm:p-8">
      <h2 className="display-face text-2xl tracking-tight">Account</h2>
      {!user.emailVerified && (
        <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-5 text-sm">
          <p className="text-bone">Verify your email to secure your account.</p>
          <button onClick={resend} disabled={resent} className="mt-3 text-acid hover:underline disabled:text-mute disabled:no-underline">
            {resent ? 'Link sent — check your inbox' : 'Resend verification link'}
          </button>
        </div>
      )}
      {user.onboarding?.intent && (
        <p className="mt-5 text-sm text-mute">
          You joined as <span className="text-bone">{titleCase(user.onboarding.intent)}</span>.
        </p>
      )}
      <button onClick={onLogout} className="mt-6 text-sm text-flare hover:underline">
        Log out
      </button>
    </section>
  )
}
