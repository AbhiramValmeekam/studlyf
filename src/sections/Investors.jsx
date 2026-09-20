import { RevealText, FadeUp } from '../components/AnimatedText'
import LogoPit from '../components/LogoPit'
import { institutions, impact } from '../data/studlyf'

export default function Investors() {
  return (
    <section id="investors" className="relative overflow-hidden">
      {/* featured institutions — full-screen pit with the heading floating over it */}
      <div className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0">
          <LogoPit logos={institutions.featured} tone="dark" className="w-full h-full" />
        </div>
        <div className="relative z-10 pointer-events-none gutter grid md:grid-cols-12 gap-y-8 md:gap-8 items-end pt-[16vh]">
          <div className="md:col-span-8">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="font-display giant-num leading-none text-violet" style={{ fontSize: 'clamp(3rem,10vw,10rem)' }}>
                05
              </span>
              <span className="eyebrow text-bone2 pb-3">Institutions</span>
            </div>
            <RevealText
              lines={['Featured', <span key="g" className="grad-text">institutions.</span>]}
              className="font-display d-1 text-bone tracking-crush"
            />
          </div>
          <div className="md:col-span-4 md:pb-4">
            <FadeUp>
              <p className="text-bone2 leading-relaxed">{institutions.featuredSub}</p>
            </FadeUp>
          </div>
        </div>
      </div>

      {/* trusted-by — its own full-screen pit */}
      <div className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0">
          <LogoPit logos={institutions.trusted} tone="dark" className="w-full h-full" />
        </div>
        <div className="relative z-10 pointer-events-none gutter grid md:grid-cols-12 gap-y-8 md:gap-8 items-end pt-[16vh]">
          <div className="md:col-span-8">
            <RevealText
              lines={['Trusted by', <span key="g" className="grad-text">people from.</span>]}
              className="font-display d-1 text-bone tracking-crush"
            />
          </div>
          <div className="md:col-span-4 md:pb-4">
            <FadeUp>
              <p className="text-bone2 leading-relaxed">{institutions.trustedSub}</p>
            </FadeUp>
          </div>
        </div>
      </div>

      {/* our impact */}
      <div className="gutter py-[16vh]">
        <div className="flex items-baseline gap-4 mb-3">
          <h2 className="font-display d-2 text-bone tracking-crush">{impact.title}</h2>
        </div>
        <p className="text-bone2 max-w-xl mb-10">{impact.sub}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {impact.stats.map((s, i) => (
            <FadeUp key={s.label} delay={i * 0.05}>
              <div className="group relative rounded-[4px] overflow-hidden border border-bone/12 aspect-[4/5]">
                <img
                  src={s.img}
                  alt={s.label}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover grayscale opacity-60 transition-all duration-700 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent transition-opacity duration-700 group-hover:opacity-60" />
                <div className="absolute inset-0 p-4 flex flex-col justify-end">
                  {s.suffix && (
                    <span className="font-display text-acid text-2xl leading-none">{s.suffix}</span>
                  )}
                  <span className="eyebrow text-bone2 mt-1">{s.label}</span>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  )
}
