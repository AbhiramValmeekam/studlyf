import { hubTools } from '../../data/mock/content'
import { Card, Tag, PageTitle } from '../../components/ui/primitives'

const TONE = { 'AI Tool': 'acid', Discount: 'violet', Scheme: 'flare', Roadmap: 'acid', Resource: 'default' }

/**
 * STUD Hub — AI tools, schemes, discounts, career resources and roadmaps.
 */
export default function StudHub() {
  return (
    <>
      <PageTitle eyebrow="STUD Hub" title="Tools & resources" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {hubTools.map((t) => (
          <Card key={t.id} hover className="p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="grid place-items-center h-11 w-11 rounded-xl bg-acid/12 text-acid font-display">{t.name[0]}</span>
              <Tag tone={TONE[t.tag] || 'default'}>{t.tag}</Tag>
            </div>
            <h3 className="font-display text-xl text-bone tracking-crush">{t.name}</h3>
            <p className="text-sm text-bone2 mt-2 flex-1">{t.desc}</p>
            <span className="text-sm text-acid mt-4 inline-flex items-center gap-1" data-cursor="hover">Open ↗</span>
          </Card>
        ))}
      </div>
    </>
  )
}
