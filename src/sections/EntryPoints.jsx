import { Link } from 'react-router-dom'
import { RevealText, FadeUp } from '../components/AnimatedText'

/**
 * EntryPoints — the public homepage's fan-out into the four ecosystem
 * experiences. Keeps the navbar minimal while giving each product a clear door.
 */
const DOORS = [
  { n: '01', label: 'Build', to: '/builder', accent: 'var(--acid)', title: 'For Builders', desc: 'Discover opportunities, build real projects, get evaluated, and become discoverable to companies.', cta: 'Start building' },
  { n: '02', label: 'Start', to: '/startup', accent: 'var(--violet)', title: 'For Founders', desc: 'Shape your startup with structured tools, measure readiness, and get discovered by investors.', cta: 'Build your startup' },
  { n: '03', label: 'Discover', to: '/investor/login', accent: 'var(--flare)', title: 'For Investors', desc: 'Verified access to filter and connect with founders by stage, traction and readiness.', cta: 'Investor portal', gated: true },
  { n: '04', label: 'Organizations', to: '/hr/login', accent: 'var(--acid)', title: 'For HR & Orgs', desc: 'Hire builders on real evidence — projects, evaluations and hackathons. Or run your own events.', cta: 'Talent platform', gated: true },
]

export default function EntryPoints() {
  return (
    <section id="entry" className="relative bg-ink text-bone py-[14vh] overflow-hidden">
      <div className="gutter">
        <div className="mb-14 max-w-3xl">
          <span className="eyebrow text-acid mb-4 block">One ecosystem</span>
          <RevealText
            lines={['Four ways', <span key="g" className="grad-text">to grow.</span>]}
            className="font-display d-1 text-bone tracking-crush"
          />
          <FadeUp>
            <p className="text-bone2 mt-6 max-w-xl">
              STUDLYF connects builders, founders, investors and organizations — separate journeys, one connected platform.
            </p>
          </FadeUp>
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          {DOORS.map((d, i) => (
            <FadeUp key={d.label} delay={i * 0.06}>
              <Link
                to={d.to}
                data-cursor="hover"
                data-cursor-label="Enter"
                className="group block h-full rounded-2xl border border-bone/12 bg-ink2/60 p-8 md:p-10 transition-colors hover:border-acid/40"
              >
                <div className="flex items-center justify-between mb-8">
                  <span className="font-display giant-num leading-none" style={{ fontSize: 'clamp(2.5rem,6vw,5rem)', color: d.accent }}>
                    {d.n}
                  </span>
                  {d.gated && <span className="text-[10px] uppercase tracking-widest text-bone2">Verified access</span>}
                </div>
                <span className="eyebrow text-bone2">{d.label}</span>
                <h3 className="font-display text-3xl md:text-4xl text-bone tracking-crush mt-1">{d.title}</h3>
                <p className="text-bone2 mt-4 max-w-md">{d.desc}</p>
                <span className="inline-flex items-center gap-2 mt-8 text-sm font-medium group-hover:gap-3 transition-all" style={{ color: d.accent }}>
                  {d.cta} ↗
                </span>
              </Link>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  )
}
