import { dateRange, displayUrl, linkPairs, LINK_LABELS } from '../parts'

// MINIMAL — Swiss, editorial whitespace. A light oversized name, then a two-column
// grid: a small uppercase label rail on the left, content on the right. One thin rule
// per section. No colour — just ink, air, and typography.
export default function Minimal({ resume: r }) {
  const links = linkPairs(r.links)
  const contact = [r.email, r.phone, r.location].filter(Boolean)
  return (
    <div className="resume-doc text-[#111]" style={{ fontFamily: 'Inter, Helvetica, Arial, sans-serif' }}>
      <header className="mb-8">
        <h1 className="text-[34px] font-light leading-none tracking-tight text-[#111]">{r.fullName || 'Your Name'}</h1>
        {r.headline && <p className="mt-2 text-[13px] font-medium uppercase tracking-[0.2em] text-[#888]">{r.headline}</p>}
        {(contact.length > 0 || links.length > 0) && (
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#666]">
            {contact.map((c) => <span key={c}>{c}</span>)}
            {links.map(([k, url]) => <span key={k}>{displayUrl(url)}</span>)}
          </p>
        )}
      </header>

      {r.summary && (
        <Row label="">
          <p className="text-[13px] font-light leading-relaxed text-[#333]">{r.summary}</p>
        </Row>
      )}

      {r.experience.length > 0 && (
        <Row label="Experience">
          <div className="space-y-4">
            {r.experience.map((e, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[12.5px] font-semibold">{e.role}</p>
                  <p className="shrink-0 text-[11px] text-[#999]">{dateRange(e)}</p>
                </div>
                <p className="text-[11.5px] text-[#666]">{[e.company, e.location].filter(Boolean).join(', ')}</p>
                {e.description && <p className="mt-1 text-[12px] font-light leading-relaxed text-[#444]">{e.description}</p>}
              </div>
            ))}
          </div>
        </Row>
      )}

      {/* APPEND_MINIMAL */}

      {r.projects.length > 0 && (
        <Row label="Projects">
          <div className="space-y-4">
            {r.projects.map((p, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[12.5px] font-semibold">{p.name}</p>
                  {p.url && <p className="shrink-0 text-[11px] text-[#999]">{displayUrl(p.url)}</p>}
                </div>
                {p.description && <p className="mt-0.5 text-[12px] font-light leading-relaxed text-[#444]">{p.description}</p>}
                {p.skills.length > 0 && <p className="mt-0.5 text-[11px] text-[#999]">{p.skills.join(' · ')}</p>}
              </div>
            ))}
          </div>
        </Row>
      )}

      {r.education.length > 0 && (
        <Row label="Education">
          <div className="space-y-3">
            {r.education.map((e, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-[12.5px] font-semibold">{e.school}</p>
                  {e.program && <p className="text-[11.5px] text-[#666]">{e.program}</p>}
                  {e.details && <p className="text-[11px] font-light text-[#888]">{e.details}</p>}
                </div>
                {e.year && <p className="shrink-0 text-[11px] text-[#999]">{e.year}</p>}
              </div>
            ))}
          </div>
        </Row>
      )}

      {r.skills.length > 0 && (
        <Row label="Skills">
          <p className="text-[12px] font-light leading-relaxed text-[#444]">{r.skills.join('   ·   ')}</p>
        </Row>
      )}

      {r.certifications.length > 0 && (
        <Row label="Certified">
          <div className="space-y-1.5">
            {r.certifications.map((c, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3 text-[12px]">
                <span className="font-medium">{c.name}{c.issuer ? ` — ${c.issuer}` : ''}</span>
                {c.year && <span className="shrink-0 text-[11px] text-[#999]">{c.year}</span>}
              </div>
            ))}
          </div>
        </Row>
      )}
    </div>
  )
}

// A section as a label rail + content. An empty label keeps the alignment but hides the word.
function Row({ label, children }) {
  return (
    <section className="grid grid-cols-[110px_1fr] gap-6 border-t border-[#e7e7e7] py-4 first:border-t-0">
      <div className="pt-0.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#aaa]">{label}</div>
      <div>{children}</div>
    </section>
  )
}
