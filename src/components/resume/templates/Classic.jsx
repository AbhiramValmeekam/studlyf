import { dateRange, displayUrl, linkPairs } from '../parts'

// CLASSIC — a traditional, ATS-friendly one-column résumé: centered serif masthead,
// hairline section rules, generous leading. Renders black-on-white as a document
// (theme-independent) so the on-screen preview matches the printed PDF exactly.
export default function Classic({ resume: r }) {
  const links = linkPairs(r.links)
  const contact = [r.location, r.email, r.phone].filter(Boolean)
  return (
    <div className="resume-doc font-serif text-[#1a1a1a]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
      <header className="text-center">
        <h1 className="text-[26px] font-bold uppercase tracking-[0.14em] leading-tight">{r.fullName || 'Your Name'}</h1>
        {r.headline && <p className="mt-1 text-[13px] italic text-[#444]">{r.headline}</p>}
        {(contact.length > 0 || links.length > 0) && (
          <p className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[11px] text-[#555]">
            {contact.map((c) => (
              <span key={c}>{c}</span>
            ))}
            {links.map(([k, url]) => (
              <span key={k}>{displayUrl(url)}</span>
            ))}
          </p>
        )}
      </header>

      {r.summary && (
        <Section title="Summary">
          <p className="text-[12px] leading-relaxed text-[#333]">{r.summary}</p>
        </Section>
      )}

      {r.experience.length > 0 && (
        <Section title="Experience">
          <div className="space-y-3">
            {r.experience.map((e, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[12.5px] font-bold">{e.role}{e.company ? `, ${e.company}` : ''}</p>
                  <p className="shrink-0 text-[11px] text-[#666]">{dateRange(e)}</p>
                </div>
                {e.location && <p className="text-[11px] italic text-[#666]">{e.location}</p>}
                {e.description && <p className="mt-0.5 text-[12px] leading-relaxed text-[#333]">{e.description}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* APPEND_CLASSIC */}

      {r.projects.length > 0 && (
        <Section title="Projects">
          <div className="space-y-3">
            {r.projects.map((p, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[12.5px] font-bold">{p.name}</p>
                  {p.url && <p className="shrink-0 text-[11px] text-[#666]">{displayUrl(p.url)}</p>}
                </div>
                {p.description && <p className="mt-0.5 text-[12px] leading-relaxed text-[#333]">{p.description}</p>}
                {p.skills.length > 0 && <p className="mt-0.5 text-[11px] italic text-[#666]">{p.skills.join(' · ')}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {r.education.length > 0 && (
        <Section title="Education">
          <div className="space-y-2">
            {r.education.map((e, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-[12.5px] font-bold">{e.school}</p>
                  {e.program && <p className="text-[12px] text-[#333]">{e.program}</p>}
                  {e.details && <p className="text-[11px] italic text-[#666]">{e.details}</p>}
                </div>
                {e.year && <p className="shrink-0 text-[11px] text-[#666]">{e.year}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {r.skills.length > 0 && (
        <Section title="Skills">
          <p className="text-[12px] leading-relaxed text-[#333]">{r.skills.join(' · ')}</p>
        </Section>
      )}

      {r.certifications.length > 0 && (
        <Section title="Certifications">
          <div className="space-y-1">
            {r.certifications.map((c, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3 text-[12px]">
                <span className="font-semibold">{c.name}{c.issuer ? `, ${c.issuer}` : ''}</span>
                {c.year && <span className="shrink-0 text-[11px] text-[#666]">{c.year}</span>}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="mt-5">
      <h2 className="border-b border-[#1a1a1a] pb-0.5 text-[12px] font-bold uppercase tracking-[0.16em]">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  )
}
