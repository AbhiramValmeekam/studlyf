import { useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useOttTitle, useMyOttShelf } from '../lib/queries'
import { Badge, Tag, Spinner } from '../components/ui/atoms'
import { ArrowIcon, Button } from '../components/ui/Button'
import { titleCase } from '../lib/format'
import { EASE } from '../lib/motion'
import { NotFoundInline } from './NotFound'

const KIND_TONE = { VIDEO: 'open', ARTICLE: 'violet', SERIES: 'soon', COURSE: 'neutral' }

function ProgressBar({ percent }) {
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-line/10"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-acid transition-[width] duration-500" style={{ width: `${percent}%` }} />
    </div>
  )
}

/**
 * /ott/:slug — one title. Playback lives wherever the source does (a link out), so what this page
 * owns is the honest part: what the title contains, and where the viewer got to in it. Progress is
 * written to the account, not to the browser, so it survives the trip to the source and back.
 */
export default function OttTitle() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const qc = useQueryClient()
  const { isAuthed } = useAuth()
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')

  const { data: t, isLoading, isError } = useOttTitle(slug)
  const shelf = useMyOttShelf(isAuthed)

  if (isLoading) {
    return (
      <div className="grid min-h-[100svh] place-items-center">
        <Spinner className="h-8 w-8 text-acid" />
      </div>
    )
  }
  if (isError || !t) return <NotFoundInline kind="title" backTo="/ott" />

  const episodic = t.kind === 'SERIES' || t.kind === 'COURSE'
  const entry = [...(shelf.data?.continueWatching ?? []), ...(shelf.data?.completed ?? [])].find((s) => s.slug === t.slug)
  const doneKeys = new Set(entry?.completedEpisodeKeys ?? [])
  const currentKey = params.get('episode') || entry?.episodeKey || null
  const doneCount = entry?.episodesDone ?? 0

  const run = async (key, fn) => {
    setBusy(key)
    setError('')
    try {
      await fn()
      await qc.invalidateQueries({ queryKey: ['ott-shelf'] })
    } catch (err) {
      setError(err?.message || 'Something went wrong — try again.')
    } finally {
      setBusy(null)
    }
  }

  const mark = (episodeKey, done) =>
    run(`ep:${episodeKey ?? 'whole'}`, () =>
      api.setOttProgress(t.id, episodeKey ? { episodeKey, completed: done, percent: done ? 100 : 0 } : { completed: done, percent: done ? 100 : 0 }),
    )

  const clear = (episodeKey) => run(`clear:${episodeKey ?? 'whole'}`, () => api.clearOttProgress(t.id, episodeKey))

  const spec = episodic
    ? `${t.episodeCount} episode${t.episodeCount === 1 ? '' : 's'}`
    : t.durationMinutes
      ? `${t.durationMinutes} min`
      : null

  return (
    <article className="pb-32 pt-36 md:pt-44">
      <div className="wrap max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
          <Link to="/ott" className="mb-6 inline-flex items-center gap-2 text-sm text-mute hover:text-bone">
            <ArrowIcon className="rotate-180" /> All titles
          </Link>
          <div className="mb-5 flex flex-wrap items-center gap-2.5">
            <Badge tone={KIND_TONE[t.kind] || 'neutral'}>{titleCase(t.kind)}</Badge>
            {t.level && <Badge tone="violet">{titleCase(t.level)}</Badge>}
            {t.featured && <Badge tone="open">Featured</Badge>}
            {t.category && <span className="text-sm text-mute">{t.category.name}</span>}
          </div>
          <h1 className="display-face text-balance text-huge">{t.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-mute">
            {t.byline && <span>{t.byline}</span>}
            {t.byline && spec && <span aria-hidden>·</span>}
            {spec && <span>{spec}</span>}
          </div>
          {t.summary && <p className="mt-5 text-lede text-bone/90">{t.summary}</p>}

          {!episodic && t.sourceUrl && (
            <div className="mt-8">
              <Button href={t.sourceUrl} magnetic={false}>
                Open <ArrowIcon />
              </Button>
            </div>
          )}
        </motion.div>

        {t.thumbnail?.url && (
          <div className="mt-10 aspect-[16/9] overflow-hidden rounded-2xl">
            <img src={t.thumbnail.url} alt={t.thumbnail.alt || ''} className="h-full w-full object-cover" />
          </div>
        )}

        {isAuthed && (
          <section className="mt-10 rounded-2xl border border-line/10 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-mute">Your progress</h2>
                <p className="mt-1.5 text-sm text-bone/90">
                  {!entry
                    ? 'Not started yet.'
                    : entry.completed
                      ? 'Finished.'
                      : episodic
                        ? `${doneCount} of ${t.episodeCount} episodes done.`
                        : `${entry.percent}% watched.`}
                </p>
              </div>
              {!episodic && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={entry?.completed ? 'outline' : 'primary'}
                    size="sm"
                    magnetic={false}
                    disabled={busy !== null}
                    onClick={() => mark(undefined, !entry?.completed)}
                  >
                    {entry?.completed ? 'Mark as unwatched' : 'Mark as watched'}
                  </Button>
                  {entry && (
                    <Button variant="ghost" size="sm" magnetic={false} disabled={busy !== null} onClick={() => clear()}>
                      Clear
                    </Button>
                  )}
                </div>
              )}
            </div>
            {!episodic && entry && (
              <div className="mt-5">
                <ProgressBar percent={entry.completed ? 100 : entry.percent} />
              </div>
            )}
            {error && <p className="mt-4 text-sm text-flare">{error}</p>}
            {episodic && (
              <p className="mt-3 text-xs text-mute">Tick off each instalment below — the shelf follows from that.</p>
            )}
          </section>
        )}

        {t.description && (
          <div className="prose-editorial mt-10" dangerouslySetInnerHTML={{ __html: t.description }} />
        )}

        {episodic && t.episodes?.length > 0 && (
          <div className="mt-14">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="display-face text-2xl">Episodes</h2>
              {isAuthed && entry && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => clear()}
                  className="text-sm text-mute hover:text-bone disabled:opacity-50"
                >
                  Clear my progress
                </button>
              )}
            </div>
            <ol className="mt-6 divide-y divide-line/10 border-t border-line/10">
              {t.episodes.map((e, i) => {
                const done = doneKeys.has(e.key)
                const active = currentKey === e.key
                return (
                  <li key={e.key} className={`flex items-start gap-4 py-4 ${active ? 'bg-line/[0.03]' : ''}`}>
                    {isAuthed && (
                      <button
                        type="button"
                        aria-label={done ? `Mark ${e.title} as unwatched` : `Mark ${e.title} as watched`}
                        aria-pressed={done}
                        disabled={busy !== null}
                        onClick={() => mark(e.key, !done)}
                        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border transition-colors ${
                          done ? 'border-acid bg-acid/20 text-acid' : 'border-line/30 text-transparent hover:border-acid/50'
                        }`}
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="m5 13 4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    <div className="min-w-0 flex-grow">
                      <div className="flex items-baseline gap-3">
                        <span className="text-sm text-mute">{String(i + 1).padStart(2, '0')}</span>
                        <h3 className={`text-base font-semibold tracking-tight ${done ? 'text-mute' : 'text-bone'}`}>{e.title}</h3>
                        {e.durationMinutes ? <span className="text-xs text-mute">{e.durationMinutes}m</span> : null}
                        {active && !done && <Badge tone="open">Up next</Badge>}
                      </div>
                      {e.summary && <p className="mt-1.5 pl-7 text-sm text-mute">{e.summary}</p>}
                    </div>
                    {e.sourceUrl && (
                      <a
                        href={e.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-0.5 shrink-0 text-sm text-acid hover:underline"
                      >
                        Open ↗
                      </a>
                    )}
                  </li>
                )
              })}
            </ol>
            {error && <p className="mt-4 text-sm text-flare">{error}</p>}
          </div>
        )}

        {!isAuthed && (
          <p className="mt-10 text-sm text-mute">
            <Link to="/login" className="text-acid hover:underline">
              Sign in
            </Link>{' '}
            to keep your place across episodes and devices.
          </p>
        )}

        {t.skills?.length > 0 && (
          <div className="mt-12 flex flex-wrap gap-2 border-t border-line/10 pt-8">
            {t.skills.map((s) => (
              <Tag key={s.slug} className="px-3 py-1.5 text-sm">
                {s.name}
              </Tag>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
