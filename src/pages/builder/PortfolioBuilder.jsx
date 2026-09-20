import { myProfile } from '../../data/mock/talent'
import { Card, Button, Tag, PageTitle, Avatar } from '../../components/ui/primitives'

/**
 * PortfolioBuilder — generates a shareable portfolio page from profile/project
 * data. Shows a preview of the public portfolio a builder gets discovered by.
 */
export default function PortfolioBuilder() {
  const p = myProfile
  return (
    <>
      <PageTitle eyebrow="Portfolio Builder" title="Your public portfolio">
        <Button variant="ghost" size="sm" onClick={() => alert('Prototype: sharing is mocked.')}>Copy link</Button>
        <Button size="sm" onClick={() => alert('Prototype: publish is mocked.')}>Publish ↗</Button>
      </PageTitle>

      <Card className="p-0 overflow-hidden">
        {/* portfolio hero */}
        <div className="relative p-8 md:p-12 bg-gradient-to-br from-violet/20 via-ink2 to-ink">
          <p className="eyebrow text-acid">Portfolio</p>
          <h2 className="font-display d-2 text-bone tracking-crush mt-2">{p.name}</h2>
          <p className="text-bone2 mt-2 max-w-xl">{p.summary}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {p.skills.map((s) => <Tag key={s} tone="acid">{s}</Tag>)}
          </div>
        </div>

        {/* projects grid */}
        <div className="p-8 md:p-10">
          <h3 className="font-display text-2xl text-bone tracking-crush mb-5">Selected work</h3>
          <div className="grid md:grid-cols-2 gap-5">
            {p.projects.map((pr) => (
              <div key={pr.id} className="rounded-xl border border-bone/12 p-6 bg-ink/40" data-cursor="hover">
                <div className="flex justify-between items-start">
                  <h4 className="font-display text-xl text-bone tracking-crush">{pr.name}</h4>
                  <span className="text-acid font-display text-2xl">{pr.evaluation}</span>
                </div>
                <p className="text-sm text-bone2 mt-2">{pr.blurb}</p>
                <div className="flex flex-wrap gap-2 mt-3">{pr.stack.map((s) => <Tag key={s}>{s}</Tag>)}</div>
                <div className="flex gap-4 mt-4 text-xs">
                  <a href="#" className="text-acid" data-cursor="hover">↗ GitHub</a>
                  <a href="#" className="text-acid" data-cursor="hover">↗ Live demo</a>
                </div>
              </div>
            ))}
          </div>

          <h3 className="font-display text-2xl text-bone tracking-crush mt-10 mb-5">Recognition</h3>
          <ul className="grid sm:grid-cols-2 gap-3">
            {p.achievements.map((a) => (
              <li key={a} className="flex gap-2 text-sm text-bone2 rounded-lg border border-bone/10 p-3"><span className="text-acid">★</span>{a}</li>
            ))}
          </ul>
        </div>
      </Card>
    </>
  )
}
