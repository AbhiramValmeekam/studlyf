import { useState } from 'react'
import { ottContent, ottCategories } from '../../data/mock/content'
import { Tag, PageTitle } from '../../components/ui/primitives'
import { Chip } from '../../components/ui/primitives'

/**
 * STUD OTT — curated technology, AI, startup, career and industry content in a
 * streaming-style grid.
 */
export default function StudOtt() {
  const [cat, setCat] = useState('All')
  const items = cat === 'All' ? ottContent : ottContent.filter((c) => c.category === cat)

  return (
    <>
      <PageTitle eyebrow="STUD OTT" title="Watch & learn" />
      <div className="flex flex-wrap gap-2 mb-8">
        {ottCategories.map((c) => (
          <Chip key={c} active={c === cat} onClick={() => setCat(c)}>{c}</Chip>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {items.map((c) => (
          <div key={c.id} className="group rounded-2xl overflow-hidden border border-bone/12 bg-ink2/60" data-cursor="hover">
            <div className="relative aspect-video overflow-hidden">
              <img src={c.img} alt={c.title} className="h-full w-full object-cover grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink to-transparent" />
              <span className="absolute bottom-3 left-3"><Tag tone="acid">{c.kind}</Tag></span>
              <span className="absolute bottom-3 right-3 text-[11px] text-bone2">{c.duration}</span>
              <span className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="grid place-items-center h-14 w-14 rounded-full bg-acid text-ink text-lg">▶</span>
              </span>
            </div>
            <div className="p-4">
              <p className="text-sm text-bone leading-snug">{c.title}</p>
              <p className="text-xs text-bone2 mt-1">{c.category}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
