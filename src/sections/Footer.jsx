import { useRef, useLayoutEffect } from 'react'
import { gsap } from '../lib/smooth'
import { RevealText } from '../components/AnimatedText'
import MagneticButton from '../components/MagneticButton'
import { footer } from '../data/studlyf'

export default function Footer() {
  const root = useRef(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.foot-word', {
        yPercent: 30,
        autoAlpha: 0,
        duration: 1.2,
        ease: 'power4.out',
        scrollTrigger: { trigger: '.foot-word', start: 'top 95%' },
      })
    }, root.current)
    return () => ctx.revert()
  }, [])

  return (
    <footer id="footer" ref={root} className="relative bg-ink pt-[14vh] overflow-hidden">
      <div className="gutter">
        <p className="eyebrow text-acid mb-8">Build your STUDLYF</p>
        <RevealText
          lines={['Learn.', 'Build.', 'Get placed.']}
          className="font-display text-bone tracking-crush leading-[0.85]"
          as="h2"
        />

        <div className="mt-12 flex flex-col sm:flex-row gap-4">
          <MagneticButton
            as="a"
            href="#top"
            data-cursor="hover"
            data-cursor-label="Start"
            className="inline-flex items-center justify-center gap-3 rounded-full bg-acid text-ink px-8 py-4 text-lg font-medium"
          >
            Start learning ↗
          </MagneticButton>
          <MagneticButton
            as="a"
            href="#contact"
            data-cursor="hover"
            className="inline-flex items-center justify-center gap-3 rounded-full border border-bone/30 text-bone px-8 py-4 text-lg font-medium hover:bg-bone hover:text-ink transition-colors"
          >
            Contact us
          </MagneticButton>
        </div>

        <div className="mt-[12vh] grid md:grid-cols-12 gap-y-10 gap-x-6 border-t border-bone/12 pt-12">
          <div className="md:col-span-4">
            <img src={footer.logo} alt="STUDLYF" className="h-9 w-auto mb-5" />
            <p className="text-bone2 max-w-xs leading-relaxed">{footer.blurb}</p>
          </div>

          <div className="md:col-span-8 md:col-start-5">
            <h3 className="eyebrow text-bone2 mb-5">Explore</h3>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
              {footer.links.map((l) => (
                <li key={l}>
                  <a href="#top" className="link-underline eyebrow text-bone/90 hover:text-acid" data-cursor>
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col md:flex-row md:items-center justify-between gap-6 text-sm text-bone2">
          <div className="flex items-center gap-5">
            {['Instagram', 'WhatsApp', 'LinkedIn', 'Email'].map((s) => (
              <a key={s} href="#contact" className="link-underline" data-cursor>
                {s}
              </a>
            ))}
          </div>
          <p>{footer.copyright}</p>
        </div>
      </div>

      <div className="mt-[8vh] overflow-hidden">
        <h2
          className="foot-word font-display text-acid text-center leading-[0.8] tracking-crush select-none"
          style={{ fontSize: 'min(26vw, 380px)' }}
        >
          STUDLYF
        </h2>
      </div>
    </footer>
  )
}
