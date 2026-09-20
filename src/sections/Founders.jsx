import { RevealText, FadeUp } from '../components/AnimatedText'
import LogoPit from '../components/LogoPit'
import { mentors } from '../data/studlyf'

export default function Founders() {
  return (
    <section id="founders" className="relative bg-bone text-ink min-h-screen overflow-hidden">
      {/* interactive physics ball pit fills the whole section — balls live
          directly on the screen, not inside a box */}
      <div className="absolute inset-0">
        <LogoPit logos={mentors.logos} tone="light" className="w-full h-full" />
      </div>

      {/* heading floats centered on top; pointer-events-none so you can still
          grab and push the balls behind it */}
      <div className="relative z-10 pointer-events-none gutter flex flex-col items-center text-center pt-[16vh]">
        <div className="flex items-baseline gap-4 mb-8">
          <span className="font-display giant-num leading-none text-flare" style={{ fontSize: 'clamp(3rem,10vw,10rem)' }}>
            04
          </span>
          <span className="eyebrow text-ink/60 pb-3">Mentors</span>
        </div>

        <RevealText
          lines={['Our mentors are from', <span key="g" className="grad-text">50+ MNCs.</span>]}
          className="font-display d-1 text-ink tracking-crush"
        />
        <FadeUp>
          <p className="mt-6 text-ink/70 max-w-xl mx-auto">{mentors.sub}</p>
        </FadeUp>
      </div>
    </section>
  )
}
