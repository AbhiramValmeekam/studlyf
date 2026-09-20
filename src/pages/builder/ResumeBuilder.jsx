import { useState } from 'react'
import { myProfile } from '../../data/mock/talent'
import { Card, Button, Tag, PageTitle } from '../../components/ui/primitives'
import { Chip } from '../../components/ui/primitives'

/**
 * ResumeBuilder — pick a template, edit the headline, preview a live resume
 * generated from the builder's profile data. (Download is mocked.)
 */
const TEMPLATES = ['Minimal', 'Technical', 'Compact']

export default function ResumeBuilder() {
  const p = myProfile
  const [template, setTemplate] = useState('Minimal')
  const [headline, setHeadline] = useState('Full-stack builder · ships fast, tests well')

  return (
    <>
      <PageTitle eyebrow="Resume Builder" title="Build your resume">
        <Button size="sm" onClick={() => alert('Prototype: PDF export is mocked.')}>Download PDF ↓</Button>
      </PageTitle>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* controls */}
        <div className="space-y-6">
          <Card className="p-5">
            <p className="text-sm text-bone mb-3">Template</p>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((t) => <Chip key={t} active={t === template} onClick={() => setTemplate(t)}>{t}</Chip>)}
            </div>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-bone mb-2">Headline</p>
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              data-cursor="text"
              className="w-full rounded-xl bg-ink/60 border border-bone/15 px-4 py-3 text-sm text-bone outline-none focus:border-acid"
            />
            <p className="text-xs text-bone2 mt-3">Pulled automatically from your profile: education, skills, projects and evaluations.</p>
          </Card>
        </div>

        {/* live preview — always renders as white paper, so we pin the neutral
            tokens to their fixed values here and let the theme toggle leave it be. */}
        <div className="lg:col-span-2">
          <div
            style={{ '--bone': '239 234 224', '--ink': '10 10 11' }}
            className={`rounded-2xl bg-bone text-ink p-8 md:p-10 shadow-2xl ${template === 'Compact' ? 'text-sm' : ''}`}
          >
            <div className="flex items-baseline justify-between border-b-2 border-ink/80 pb-3">
              <h2 className="font-display text-3xl tracking-crush">{p.name}</h2>
              <span className="text-xs text-ink/60">{p.location}</span>
            </div>
            <p className="italic mt-3 text-ink/70">{headline}</p>
            <p className="text-sm mt-1 text-ink/60">{p.education} · {p.github}</p>

            <Block title="Skills" accent={template === 'Technical'}>
              <div className="flex flex-wrap gap-1.5">
                {p.skills.map((s) => <span key={s} className="text-xs border border-ink/25 rounded px-2 py-0.5">{s}</span>)}
              </div>
            </Block>

            <Block title="Projects" accent={template === 'Technical'}>
              {p.projects.map((pr) => (
                <div key={pr.id} className="mb-3">
                  <div className="flex justify-between">
                    <p className="font-medium">{pr.name}</p>
                    <span className="text-xs text-ink/60">Eval {pr.evaluation}/100</span>
                  </div>
                  <p className="text-sm text-ink/70">{pr.blurb}</p>
                  <p className="text-xs text-ink/50">{pr.stack.join(' · ')}</p>
                </div>
              ))}
            </Block>

            <Block title="Achievements" accent={template === 'Technical'}>
              <ul className="list-disc list-inside text-sm text-ink/70 space-y-0.5">
                {p.achievements.map((a) => <li key={a}>{a}</li>)}
              </ul>
            </Block>
          </div>
        </div>
      </div>
    </>
  )
}

function Block({ title, children, accent }) {
  return (
    <div className="mt-6">
      <h3 className={`font-display text-lg tracking-crush mb-2 ${accent ? 'text-flare' : ''}`}>{title.toUpperCase()}</h3>
      {children}
    </div>
  )
}
