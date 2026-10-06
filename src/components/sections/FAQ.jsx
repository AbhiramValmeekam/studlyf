import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SectionHeading } from '../ui/SectionHeading'
import { faqs } from '../../data/studlyf'
import { EASE } from '../../lib/motion'

function Item({ item, open, onToggle }) {
  return (
    <div className="border-b border-line/10">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-6 py-6 text-left"
        aria-expanded={open}
      >
        <span className="text-lg font-medium text-bone md:text-xl">{item.q}</span>
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-colors duration-300 ${
            open ? 'border-acid bg-acid text-ink' : 'border-line/20 text-mute'
          }`}
        >
          <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.3, ease: EASE }}>
            +
          </motion.span>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <p className="max-w-2xl pb-6 text-mute">{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function FAQ() {
  const [open, setOpen] = useState(0)
  return (
    <section className="relative py-28 md:py-36">
      <div className="wrap grid gap-14 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <SectionHeading eyebrow="Answers" title="Frequently asked questions." />
          <p className="mt-5 text-mute">Can’t find an answer? Reach out — we’re happy to help.</p>
        </div>
        <div>
          {faqs.map((f, i) => (
            <Item key={i} item={f} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
          ))}
        </div>
      </div>
    </section>
  )
}
