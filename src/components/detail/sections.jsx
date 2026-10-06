import { Badge, Tag } from '../ui/atoms'

/**
 * The section grammar every public detail page shares (opportunity, job, community project,
 * course). Unstop's pages are a stack of labelled blocks beside a sticky action rail; these
 * primitives give STUDLYF the same shape in its own tokens — an acid eyebrow, a Clash-Display
 * heading, and whatever the block needs underneath.
 */

export function DetailSection({ id, eyebrow, title, action, children, className = '' }) {
  return (
    <section id={id} className={`scroll-mt-28 border-t border-line/10 pt-10 first:border-t-0 first:pt-0 ${className}`}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
          {title && <h2 className="display-face text-2xl tracking-tight md:text-3xl">{title}</h2>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

/** A definition list of label/value rows for a rail or a compact meta block. */
export function MetaList({ items, className = '' }) {
  const rows = (items ?? []).filter((i) => i && i.value !== null && i.value !== undefined && i.value !== '')
  if (!rows.length) return null
  return (
    <dl className={`space-y-3 ${className}`}>
      {rows.map((i) => (
        <div key={i.label} className="flex items-start justify-between gap-4">
          <dt className="text-sm text-mute">{i.label}</dt>
          <dd className="text-right text-sm text-bone">{i.value}</dd>
        </div>
      ))}
    </dl>
  )
}

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

const fmtRange = (a, b) => {
  const start = fmtDate(a)
  const end = fmtDate(b)
  if (start && end) return `${start} → ${end}`
  return start || end || null
}

/** Stages / rounds as a vertical rail with numbered nodes. */
export function Timeline({ rounds, empty }) {
  if (!rounds?.length) return empty ?? null
  return (
    <ol className="relative space-y-6 border-l border-line/15 pl-6">
      {rounds.map((r, i) => {
        const when = fmtRange(r.startsAt, r.endsAt)
        return (
          <li key={`${r.title}-${i}`} className="relative">
            <span className="absolute -left-[31px] top-1.5 grid h-3 w-3 place-items-center rounded-full bg-acid ring-4 ring-ink" />
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-bone">{r.title}</h3>
              {r.mode && <Badge tone="neutral">{r.mode}</Badge>}
            </div>
            {(when || r.location) && (
              <p className="mt-1 text-sm text-mute">{[when, r.location].filter(Boolean).join(' · ')}</p>
            )}
            {r.description && <p className="prose-editorial mt-2 text-sm">{r.description}</p>}
          </li>
        )
      })}
    </ol>
  )
}

const money = (value, currency) => {
  if (value === null || value === undefined) return null
  const n = Number(value).toLocaleString('en-IN')
  return currency ? `${currency} ${n}` : n
}

/** Structured rewards — a table of prize rows, each card reading as one placement. */
export function PrizeTable({ prizes }) {
  if (!prizes?.length) return null
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {prizes.map((p, i) => {
        const amount = money(p.value, p.currency)
        return (
          <div key={`${p.title}-${i}`} className="card-surface p-5">
            {p.rank && <p className="eyebrow mb-2">{p.rank}</p>}
            <h3 className="display-face text-lg tracking-tight">{p.title}</h3>
            {amount && <p className="mt-2 text-xl text-acid">{amount}</p>}
            {p.quantity ? <p className="mt-0.5 text-xs text-mute">{p.quantity} available</p> : null}
            {p.description && <p className="mt-2 text-sm text-mute">{p.description}</p>}
          </div>
        )
      })}
    </div>
  )
}

/** Native <details> — accessible, keyboard-operable, and no JavaScript. */
export function FaqList({ faqs }) {
  if (!faqs?.length) return null
  return (
    <div className="divide-y divide-line/10">
      {faqs.map((f, i) => (
        <details key={`${f.question}-${i}`} className="group py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-bone">
            <span className="font-medium">{f.question}</span>
            <span className="shrink-0 text-mute transition-transform duration-300 group-open:rotate-45" aria-hidden>
              +
            </span>
          </summary>
          {f.answer && <div className="prose-editorial mt-3 text-sm" dangerouslySetInnerHTML={{ __html: f.answer }} />}
        </details>
      ))}
    </div>
  )
}

/** A grid of supporting images. Documents are never rendered here. */
export function MediaGallery({ media, className = '' }) {
  const shots = (media ?? []).filter((m) => m && m.url && m.mimeType !== 'application/pdf')
  if (!shots.length) return null
  return (
    <div className={`grid gap-3 sm:grid-cols-2 ${className}`}>
      {shots.map((m, i) => (
        <a
          key={m.id ?? i}
          href={m.url}
          target="_blank"
          rel="noreferrer"
          className="overflow-hidden rounded-2xl border border-line/10"
        >
          <img
            src={m.url}
            alt={m.alt || m.altText || m.name || ''}
            loading="lazy"
            className="aspect-video w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
          />
        </a>
      ))}
    </div>
  )
}

/** A row of skills/technologies, each an optional link into the community tag filter. */
export function TagRow({ tags, hrefFor }) {
  if (!tags?.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((t) => {
        const key = t.slug || t.name
        const href = hrefFor?.(t)
        return href ? (
          <a key={key} href={href}>
            <Tag className="transition-colors hover:border-acid/40 hover:text-bone">{t.name}</Tag>
          </a>
        ) : (
          <Tag key={key}>{t.name}</Tag>
        )
      })}
    </div>
  )
}
