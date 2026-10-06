import { motion } from 'framer-motion'
import { humanAuthority } from '../../data/studlyf'
import { EASE, inView } from '../../lib/motion'

function Row({ items, tone, label, icon }) {
  return (
    <div className={`flex-1 rounded-3xl border p-8 ${tone === 'old' ? 'border-line/10 bg-ink2/40' : 'border-acid/25 bg-acid/[0.04]'}`}>
      <p className={`eyebrow mb-6 ${tone === 'new' ? 'text-acid' : ''}`}>{label}</p>
      <ul className="space-y-4">
        {items.map((it, i) => (
          <motion.li
            key={it}
            className="flex items-center gap-3 text-lg"
            initial={{ opacity: 0, x: tone === 'old' ? -16 : 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={inView}
            transition={{ duration: 0.5, ease: EASE, delay: i * 0.07 }}
          >
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs ${
                tone === 'old' ? 'bg-line/10 text-mute' : 'bg-acid text-ink'
              }`}
            >
              {icon}
            </span>
            <span className={tone === 'old' ? 'text-mute line-through decoration-line/30' : 'text-bone'}>{it}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

export function HumanAuthority() {
  return (
    <section className="relative py-28 md:py-36">
      <div className="wrap">
        <div className="max-w-3xl">
          <p className="eyebrow mb-4 flex items-center gap-3">
            <span className="inline-block h-px w-8 bg-acid" />
            Reinvented
          </p>
          <h2 className="display-face text-huge text-balance">A smarter way to learn.</h2>
          <p className="mt-5 text-lede text-mute">{humanAuthority.subtitle}</p>
        </div>

        <div className="mt-14 flex flex-col gap-6 md:flex-row">
          <Row items={humanAuthority.oldWay} tone="old" label="Old way" icon="✕" />
          <Row items={humanAuthority.newWay} tone="new" label="New way" icon="✓" />
        </div>
      </div>
    </section>
  )
}
