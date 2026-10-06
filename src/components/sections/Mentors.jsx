import { OrbitingLogos } from '../ui/OrbitingLogos'
import { mnc } from '../../data/studlyf'

// 29 MNC logos spread across three counter-rotating rings. Counts sum to the
// full list; if the data grows, extend the last ring's count.
const rings = [
  { f: 1, count: 13, duration: 52, reverse: false },
  { f: 0.7, count: 10, duration: 42, reverse: true },
  { f: 0.44, count: 6, duration: 32, reverse: false },
]

export function Mentors() {
  return (
    <section className="relative py-24 text-center md:py-28">
      <div className="wrap">
        <h2 className="display-face text-huge">
          Mentored by engineers from <span className="text-acid">50+ MNCs</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-mute">
          Learn from professionals at the companies you want to join.
        </p>
      </div>
      <div className="mt-14">
        <OrbitingLogos
          logos={mnc}
          rings={rings}
          center={
            <div className="grid size-28 place-items-center rounded-full border border-line/10 bg-ink2/70 backdrop-blur md:size-32">
              <div className="display-face text-2xl leading-none text-acid md:text-3xl">50+</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-mute">MNCs</div>
            </div>
          }
        />
      </div>
    </section>
  )
}
