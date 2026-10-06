import { motion } from 'framer-motion'
import { SectionHeading } from '../ui/SectionHeading'
import { Badge } from '../ui/atoms'
import { ArrowIcon } from '../ui/Button'
import { insights } from '../../data/studlyf'
import { EASE, inView } from '../../lib/motion'

export function Insights() {
  return (
    <section className="relative py-28 md:py-36">
      <div className="wrap">
        <SectionHeading
          eyebrow="Resources"
          title="Insights & playbooks."
          aside={<p className="max-w-xs text-mute">{insights.intro}</p>}
        />

        <div className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {insights.posts.map((post, i) => (
            <motion.article
              key={post.title}
              className="group cursor-pointer"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={inView}
              transition={{ duration: 0.6, ease: EASE, delay: Math.min(i * 0.05, 0.3) }}
            >
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl">
                <img
                  src={post.image}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-105"
                />
                <div className="absolute left-3 top-3">
                  <Badge>{post.tag}</Badge>
                </div>
              </div>
              <h3 className="mt-4 flex items-start justify-between gap-3 text-balance text-lg font-semibold leading-tight tracking-tight text-bone">
                {post.title}
                <ArrowIcon className="mt-1 shrink-0 -rotate-45 text-mute transition-transform duration-300 group-hover:rotate-0 group-hover:text-acid" />
              </h3>
              <p className="mt-2 text-sm text-mute">{post.excerpt}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
