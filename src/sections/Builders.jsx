import SectionHeading from '../components/SectionHeading'
import { FadeUp, RevealText } from '../components/AnimatedText'
import { eraShift } from '../data/studlyf'

export default function Builders() {
  return (
    <section id="builders" className="relative py-[14vh] gutter">
      <div className="grid md:grid-cols-12 gap-y-14 md:gap-8">
        <div className="md:col-span-7">
          <SectionHeading
            index="01"
            label="The Shift"
            lines={['The era of', 'human authority.']}
          />
        </div>

        <div className="md:col-span-4 md:col-start-9 md:pt-24">
          <FadeUp>
            <p className="text-lg text-bone2 leading-relaxed">{eraShift.sub}</p>
          </FadeUp>
        </div>
      </div>

      {/* Old Way vs New Way */}
      <div className="mt-[10vh] grid md:grid-cols-2 gap-px bg-bone/12 border border-bone/12">
        <div className="bg-ink p-8 md:p-10">
          <h3 className="eyebrow text-flare mb-8">Old Way</h3>
          <ul className="space-y-5">
            {eraShift.oldWay.map((item, i) => (
              <FadeUp key={item} delay={i * 0.05}>
                <li className="flex items-center gap-4 text-lg md:text-xl text-bone2 line-through decoration-flare/50">
                  <span className="text-flare">✕</span>
                  {item}
                </li>
              </FadeUp>
            ))}
          </ul>
        </div>
        <div className="bg-ink2 p-8 md:p-10">
          <h3 className="eyebrow text-acid mb-8">New Way</h3>
          <ul className="space-y-5">
            {eraShift.newWay.map((item, i) => (
              <FadeUp key={item} delay={i * 0.05}>
                <li className="flex items-center gap-4 text-lg md:text-xl text-bone">
                  <span className="text-acid">→</span>
                  {item}
                </li>
              </FadeUp>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-[12vh] border-t border-bone/10 pt-10">
        <RevealText
          lines={['Learn by', 'doing —', 'not memorizing.']}
          className="font-display d-1 text-bone tracking-crush"
        />
      </div>
    </section>
  )
}
