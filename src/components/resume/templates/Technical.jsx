import { dateRange, displayUrl, linkPairs, LINK_LABELS } from '../parts'

// TECHNICAL — a developer-flavoured résumé: monospace labels and metadata, `//` section
// markers, skill chips, projects surfaced early. Body copy stays in a readable sans;
// only the scaffolding is mono. Teal accent, black-on-white, print-clean.
const ACCENT = '#0f766e'
const mono = { fontFamily: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace' }

export default function Technical({ resume: r }) {
  const links = linkPairs(r.links)
  const contact = [r.email, r.phone, r.location].filter(Boolean)
  return (
    <div className="resume-doc text-[#1a1a1a]" style={{ fontFamily: 'Inter, Arial, sans-serif' }}>
      <header className="border-b-2 pb-3" style={{ borderColor: ACCENT }}>
        <h1 className="text-[25px] font-extrabold leading-tight text-[#111]">{r.fullName || 'Your Name'}</h1>
        {r.headline && <p className="mt-0.5 text-[12.5px]" style={{ ...mono, color: ACCENT }}>{r.headline}</p>}
        {(contact.length > 0 || links.length > 0) && (
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[#555]" style={mono}>
            {contact.map((c) => <span key={c}>{c}</span>)}
            {links.map(([k, url]) => <span key={k} style={{ color: ACCENT }}>{displayUrl(url)}</span>)}
          </p>
        )}
      </header>

      {r.summary && (
        <Section title="about">
          <p className="text-[12px] leading-relaxed text-[#333]">{r.summary}</p>
        </Section>
      )}

      {r.skills.length > 0 && (
        <Section title="skills">
          <div className="flex flex-wrap gap-1.5">
            {r.skills.map((s) => (
              <span key={s} className="rounded px-1.5 py-0.5 text-[10.5px]" style={{ ...mono, backgroundColor: '#e6f4f1', color: ACCENT }}>{s}</span>
            ))}
          </div>
        </Section>
      )}

      {/* APPEND_TECHNICAL */}

      {r.projects.length > 0 && (
        <Section title="projects">
          <div className="space-y-3">
            {r.projects.map((p, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[12.5px] font-bold text-[#111]">{p.name}</p>
                  {p.url && <p className="shrink-0 text-[10.5px]" style={{ ...mono, color: ACCENT }}>{displayUrl(p.url)}</p>}
                </div>
                {p.description && <p className="mt-0.5 text-[12px] leading-relaxed text-[#333]">{p.description}</p>}
                {p.skills.length > 0 && (
                  <p className="mt-0.5 text-[10.5px] text-[#777]" style={mono}>[ {p.skills.join(', ')} ]</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {r.experience.length > 0 && (
        <Section title="experience">
          <div className="space-y-3">
            {r.experience.map((e, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[12.5px] font-bold text-[#111]">{e.role} <span className="font-normal text-[#666]">@ {e.company}</span></p>
                  <p className="shrink-0 text-[10.5px] text-[#777]" style={mono}>{dateRange(e)}</p>
                </div>
                {e.location && <p className="text-[10.5px] text-[#888]" style={mono}>{e.location}</p>}
                {e.description && <p className="mt-1 text-[12px] leading-relaxed text-[#333]">{e.description}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {r.education.length > 0 && (
        <Section title="education">
          <div className="space-y-2">
            {r.education.map((e, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-[12.5px] font-bold text-[#111]">{e.school}</p>
                  {e.program && <p className="text-[11.5px] text-[#555]">{e.program}</p>}
                  {e.details && <p className="text-[11px] text-[#888]">{e.details}</p>}
                </div>
                {e.year && <p className="shrink-0 text-[10.5px] text-[#777]" style={mono}>{e.year}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {r.certifications.length > 0 && (
        <Section title="certifications">
          <div className="space-y-1">
            {r.certifications.map((c, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3 text-[12px]">
                <span className="font-medium">{c.name}{c.issuer ? ` · ${c.issuer}` : ''}</span>
                {c.year && <span className="shrink-0 text-[10.5px] text-[#777]" style={mono}>{c.year}</span>}
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
    <section className="mt-4">
      <h2 className="text-[12px] font-bold" style={{ ...mono, color: ACCENT }}>
        <span className="text-[#999]">// </span>{title}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  )
}
