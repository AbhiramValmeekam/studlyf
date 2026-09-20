import { myProfile } from '../../data/mock/talent'
import { Card, Tag, Button, PageTitle, Avatar } from '../../components/ui/primitives'
import { ProgressRing, ProgressBar } from '../../components/ui/ProgressRing'

/**
 * Builder Profile — the evidence surface that makes a builder discoverable:
 * education, skills, links, projects (with evaluations), hackathons,
 * achievements, experience, portfolio, resume.
 */
function Section({ title, action, children }) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl text-bone tracking-crush">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  )
}

export default function BuilderProfile() {
  const p = myProfile
  return (
    <>
      <PageTitle eyebrow="Builder Profile" title="Your profile">
        <Button to="/builder/resume" variant="ghost" size="sm">Resume</Button>
        <Button to="/builder/portfolio" size="sm">Portfolio ↗</Button>
      </PageTitle>

      {/* header card */}
      <Card className="p-7 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <Avatar src={p.avatar} name={p.name} size={88} />
          <div className="flex-1">
            <h2 className="font-display text-3xl text-bone tracking-crush">{p.name}</h2>
            <p className="text-bone2 mt-1">{p.education}</p>
            <p className="text-sm text-bone2/80 mt-2 max-w-xl">{p.summary}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Tag tone="acid">{p.role}</Tag>
              <Tag>{p.location}</Tag>
              <Tag>{p.availability}</Tag>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ProgressRing value={p.completion} label="COMPLETE" />
          </div>
        </div>
        <div className="flex flex-wrap gap-4 mt-5 pt-5 border-t border-bone/10 text-sm text-bone2">
          <a href="#" className="hover:text-acid" data-cursor="hover">↗ {p.github}</a>
          <a href="#" className="hover:text-acid" data-cursor="hover">↗ {p.linkedin}</a>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* projects with evaluations */}
          <Section title="Projects & Evaluations">
            <div className="space-y-4">
              {p.projects.map((proj) => (
                <div key={proj.id} className="rounded-xl border border-bone/10 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-bone font-medium">{proj.name}</p>
                      <p className="text-sm text-bone2 mt-1">{proj.blurb}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {proj.stack.map((s) => <Tag key={s}>{s}</Tag>)}
                      </div>
                    </div>
                    <div className="text-center shrink-0">
                      <span className="font-display text-3xl text-acid leading-none">{proj.evaluation}</span>
                      <span className="block text-[10px] tracking-widest text-bone2 mt-1">SCORE</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    {proj.breakdown.map((b) => (
                      <div key={b.label}>
                        <div className="flex justify-between text-[11px] text-bone2 mb-1">
                          <span>{b.label}</span><span className="text-bone">{b.value}</span>
                        </div>
                        <ProgressBar value={b.value} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* experience */}
          <Section title="Experience">
            <ul className="space-y-4">
              <li className="flex gap-4">
                <span className="mt-1 h-2 w-2 rounded-full bg-acid shrink-0" />
                <div>
                  <p className="text-bone">SDE Intern · Northwind</p>
                  <p className="text-xs text-bone2">Summer 2025 · Built internal developer tooling used by 200+ engineers.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="mt-1 h-2 w-2 rounded-full bg-violet shrink-0" />
                <div>
                  <p className="text-bone">Open-source · GSoC 2025</p>
                  <p className="text-xs text-bone2">Contributed real-time sync features to a collaborative editor.</p>
                </div>
              </li>
            </ul>
          </Section>
        </div>

        {/* sidebar */}
        <div className="space-y-6">
          <Section title="Skills">
            <div className="flex flex-wrap gap-2">
              {p.skills.map((s) => <Tag key={s} tone="acid">{s}</Tag>)}
            </div>
          </Section>

          <Section title="Hackathons">
            <p className="font-display text-4xl text-flare leading-none">{p.hackathons}</p>
            <p className="text-xs text-bone2 mt-1">events participated</p>
          </Section>

          <Section title="Achievements">
            <ul className="space-y-2">
              {p.achievements.map((a) => (
                <li key={a} className="flex gap-2 text-sm text-bone2">
                  <span className="text-acid">★</span>{a}
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </>
  )
}
