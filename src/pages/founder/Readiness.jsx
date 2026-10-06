import { Link } from 'react-router-dom'
import { Panel, ProductPage, QueryState } from '../../components/ecosystem/product'
import { AREA_LINK, ReadinessMeter, useFounderProfile } from './shared'

export default function ReadinessPage() {
  const q = useFounderProfile()
  const r = q.data?.readiness
  return (
    <ProductPage
      eco="FOUNDER"
      title="Startup readiness"
      subtitle="Eight areas investors look at. Every point is explained — no hidden scoring. Verified investors see your score and which areas are complete, not your private notes."
    >
      <QueryState query={q}>
        {r && (
          <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
            <Panel>
              <ReadinessMeter readiness={r} />
            </Panel>
            <div className="grid gap-4 md:grid-cols-2">
              {r.areas.map((a) => (
                <article key={a.key} className="card-surface p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-bone">{a.label}</h2>
                    <span className={`font-mono text-xs ${a.complete ? 'text-acid' : 'text-mute'}`}>
                      {a.score}/{a.weight}
                    </span>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {a.checks.map((c) => (
                      <li key={c.label} className="flex items-center gap-2 text-sm">
                        <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${c.done ? 'bg-violet text-white' : 'border border-line/25'}`} aria-hidden>
                          {c.done ? '✓' : ''}
                        </span>
                        <span className={c.done ? 'text-bone' : 'text-mute'}>
                          {c.label}
                          <span className="sr-only">{c.done ? ' — done' : ' — missing'}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {!a.complete && (
                    <Link to={AREA_LINK[a.key]} className="mt-4 inline-block text-sm font-medium text-violet hover:underline">
                      Improve {a.label.toLowerCase()} →
                    </Link>
                  )}
                </article>
              ))}
            </div>
          </div>
        )}
      </QueryState>
    </ProductPage>
  )
}
