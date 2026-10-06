import { Link } from 'react-router-dom'
import { ResourceCard } from '../ui/cards'
import { SectionHeading } from '../ui/SectionHeading'
import { ArrowIcon } from '../ui/Button'

export function FeaturedResources({ items = [] }) {
  if (!items.length) return null
  return (
    <section className="relative border-t border-line/10 py-28 md:py-36">
      <div className="wrap">
        <SectionHeading
          eyebrow="Learn"
          title="Resources to help you win."
          aside={
            <Link to="/resources" className="group inline-flex items-center gap-2 text-bone">
              All resources
              <ArrowIcon className="transition-transform group-hover:translate-x-1" />
            </Link>
          }
        />
        <div className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, 6).map((r, i) => (
            <ResourceCard key={r.id} resource={r} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
