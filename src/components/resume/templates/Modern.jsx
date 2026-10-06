import { dateRange, displayUrl, linkPairs, LINK_LABELS } from '../parts'

// MODERN — a two-column layout with a tinted sidebar (contact, skills, education) and
// a content column (summary, experience, projects). Sans-serif, accent-led, still
// print-clean. Black-on-white document with a single brand accent.
const ACCENT = '#5B2CFF'

export default function Modern({ resume: r }) {
  const links = linkPairs(r.links)
  return (
    <div className="resume-doc-flush flex min-h-full text-[#1c1c1c]" style={{ fontFamily: 'Inter, Arial, sans-serif' }}>
      {/* Sidebar */}
      <aside className="w-[34%] shrink-0 bg-[#f4f2ff] px-6 py-8" style={{ borderRight: `2px solid ${ACCENT}` }}>
        <div className="space-y-6">
          {(r.location || r.email || r.phone) && (
            <SideBlock title="Contact">
              {r.location && <p className="text-[11px] text-[#444]">{r.location}</p>}
              {r.email && <p className="break-all text-[11px] text-[#444]">{r.email}</p>}
              {r.phone && <p className="text-[11px] text-[#444]">{r.phone}</p>}
            </SideBlock>
          )}
          {links.length > 0 && (
            <SideBlock title="Links">
              {links.map(([k, url]) => (
                <p key={k} className="break-all text-[11px] text-[#444]">
                  <span className="font-semibold text-[#222]">{LINK_LABELS[k]}: </span>
                  {displayUrl(url)}
                </p>
              ))}
            </SideBlock>
          )}
          {r.skills.length > 0 && (
            <SideBlock title="Skills">
              <div className="flex flex-wrap gap-1.5">
                {r.skills.map((s) => (
                  <span key={s} className="rounded-full bg-white px-2 py-0.5 text-[10.5px] font-medium text-[#333] ring-1 ring-[#ddd]">{s}</span>
                ))}
              </div>
            </SideBlock>
          )}
          {r.education.length > 0 && (
            <SideBlock title="Education">
              <div className="space-y-2">
                {r.education.map((e, i) => (
                  <div key={i}>
                    <p className="text-[11.5px] font-semibold text-[#222]">{e.school}</p>
                    {e.program && <p className="text-[10.5px] text-[#555]">{e.program}</p>}
                    {e.year && <p className="text-[10.5px] text-[#777]">{e.year}</p>}
                  </div>
                ))}
              </div>
            </SideBlock>
          )}
          {/* APPEND_MODERN_SIDE */}
          {r.certifications.length > 0 && (
            <SideBlock title="Certifications">
              <div className="space-y-1.5">
                {r.certifications.map((c, i) => (
                  <div key={i}>
                    <p className="text-[11px] font-semibold text-[#222]">{c.name}</p>
                    {(c.issuer || c.year) && <p className="text-[10.5px] text-[#666]">{[c.issuer, c.year].filter(Boolean).join(' · ')}</p>}
                  </div>
                ))}
              </div>
            </SideBlock>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 px-7 py-8">
        <header>
          <h1 className="text-[24px] font-extrabold leading-tight text-[#111]">{r.fullName || 'Your Name'}</h1>
          {r.headline && <p className="mt-1 text-[13px] font-medium" style={{ color: ACCENT }}>{r.headline}</p>}
        </header>
        {/* APPEND_MODERN_MAIN */}
        {r.summary && (
          <MainSection title="Profile">
            <p className="text-[12px] leading-relaxed text-[#333]">{r.summary}</p>
          </MainSection>
        )}
        {r.experience.length > 0 && (
          <MainSection title="Experience">
            <div className="space-y-3.5">
              {r.experience.map((e, i) => (
                <div key={i}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[12.5px] font-bold text-[#111]">{e.role}</p>
                    <p className="shrink-0 text-[10.5px] text-[#777]">{dateRange(e)}</p>
                  </div>
                  <p className="text-[11.5px] font-medium" style={{ color: ACCENT }}>{[e.company, e.location].filter(Boolean).join(' · ')}</p>
                  {e.description && <p className="mt-1 text-[12px] leading-relaxed text-[#333]">{e.description}</p>}
                </div>
              ))}
            </div>
          </MainSection>
        )}
        {r.projects.length > 0 && (
          <MainSection title="Projects">
            <div className="space-y-3">
              {r.projects.map((p, i) => (
                <div key={i}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[12.5px] font-bold text-[#111]">{p.name}</p>
                    {p.url && <p className="shrink-0 text-[10.5px] text-[#777]">{displayUrl(p.url)}</p>}
                  </div>
                  {p.description && <p className="mt-0.5 text-[12px] leading-relaxed text-[#333]">{p.description}</p>}
                  {p.skills.length > 0 && <p className="mt-0.5 text-[10.5px] text-[#777]">{p.skills.join(' · ')}</p>}
                </div>
              ))}
            </div>
          </MainSection>
        )}
      </main>
    </div>
  )
}

function SideBlock({ title, children }) {
  return (
    <section>
      <h2 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: ACCENT }}>{title}</h2>
      <div className="space-y-1">{children}</div>
    </section>
  )
}

function MainSection({ title, children }) {
  return (
    <section className="mt-5">
      <h2 className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#111]">{title}</h2>
      <div className="mt-0.5 h-0.5 w-8" style={{ backgroundColor: ACCENT }} />
      <div className="mt-2.5">{children}</div>
    </section>
  )
}
