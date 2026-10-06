import { motion } from 'framer-motion'
import { Button, ArrowIcon } from '../ui/Button'
import { EASE, inView } from '../../lib/motion'

// A fixed dark "spotlight" band — identical in light and dark themes so the
// closing CTA always pops. Colors are hardcoded, not theme tokens.
export function JoinCTA({ content }) {
  const title = content?.title || 'Start building today.'
  const subtitle =
    content?.subtitle || 'Create your free profile, start learning by building, and let the right opportunities find you.'
  const cta = content?.primaryCta || { label: 'Join STUDLYF', url: '/signup' }

  return (
    <section className="relative overflow-hidden bg-[#08080a] py-32 text-[#f4f4f0] md:py-44">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-1/2 top-1/2 h-[40vw] w-[40vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet/20 blur-[130px]" />
        <div className="absolute bottom-0 left-[20%] h-[24vw] w-[24vw] rounded-full bg-acid/10 blur-[120px]" />
      </div>
      <div className="relative mx-auto max-w-edge px-[clamp(1rem,4vw,3.5rem)] text-center">
        <motion.h2
          className="display-face mx-auto max-w-5xl text-balance text-mega leading-[0.95]"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={inView}
          transition={{ duration: 0.8, ease: EASE }}
        >
          {title}
        </motion.h2>
        <motion.p
          className="mx-auto mt-7 max-w-xl text-lede text-[#f4f4f0]/60"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={inView}
          transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
        >
          {subtitle}
        </motion.p>
        <motion.div
          className="mt-12 flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={inView}
          transition={{ duration: 0.7, ease: EASE, delay: 0.28 }}
        >
          <Button
            to={cta.url?.startsWith('http') ? undefined : cta.url}
            href={cta.url?.startsWith('http') ? cta.url : undefined}
            size="lg"
          >
            {cta.label} <ArrowIcon />
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
