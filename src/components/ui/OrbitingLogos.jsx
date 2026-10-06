import * as React from 'react'

// Rotating orbital rings of logos. An original take on the common "orbiting
// logos" motif (React Bits Pro's paid `Circles` needs a license key and a
// shadcn/TS setup this project doesn't use, so this is built from scratch on
// the project's own tokens). Each ring spins; every chip counter-spins by the
// same duration in the opposite direction so the logos stay upright. Pauses on
// hover and honours prefers-reduced-motion.
const cx = (...classes) => classes.filter(Boolean).join(' ')

const CSS = `
@keyframes orbit-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.orbit { position: relative; width: var(--d); height: var(--d); margin-inline: auto; }
.orbit-ring {
  position: absolute; inset: 0; margin: auto;
  width: calc(var(--d) * var(--f)); height: calc(var(--d) * var(--f));
  border-radius: 9999px; border: 1px dashed rgb(var(--line) / 0.12);
  animation: orbit-spin var(--dur) linear infinite;
}
.orbit-node {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%) rotate(var(--a)) translateY(calc(var(--d) * var(--f) / -2));
}
.orbit-keep { animation: orbit-spin var(--dur) linear infinite; }
.orbit-chip {
  display: grid; place-items: center; height: calc(var(--d) * 0.1); padding-inline: 0.7rem;
  border-radius: 9999px; background: #fff; border: 1px solid rgb(var(--line) / 0.1);
  box-shadow: 0 2px 12px rgba(0,0,0,0.18);
}
.orbit-chip img { height: calc(var(--d) * 0.042); width: auto; max-width: calc(var(--d) * 0.14); object-fit: contain; }
.orbit:hover .orbit-ring, .orbit:hover .orbit-keep { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) {
  .orbit-ring, .orbit-keep { animation: none !important; }
}
`

export function OrbitingLogos({ logos, rings, center, className }) {
  // Slice the flat logo list into the rings, in order.
  let cursor = 0
  const grouped = rings.map((ring) => {
    const slice = logos.slice(cursor, cursor + ring.count)
    cursor += ring.count
    return { ...ring, logos: slice }
  })

  return (
    <div className={cx('orbit', className)} style={{ '--d': 'clamp(320px, 92vw, 600px)' }}>
      <style>{CSS}</style>

      {grouped.map((ring, ri) => (
        <div
          key={ri}
          className="orbit-ring"
          style={{ '--f': ring.f, '--dur': `${ring.duration}s`, animationDirection: ring.reverse ? 'reverse' : 'normal' }}
        >
          {ring.logos.map((logo, i) => {
            const angle = (360 / ring.logos.length) * i
            return (
              <div key={logo.name} className="orbit-node" style={{ '--a': `${angle}deg` }}>
                {/* Counter-spin cancels the ring's rotation; the static rotate
                    cancels this node's placement angle — chip ends up upright. */}
                <div
                  className="orbit-keep"
                  style={{ '--dur': `${ring.duration}s`, animationDirection: ring.reverse ? 'normal' : 'reverse' }}
                >
                  <div className="orbit-chip" style={{ transform: `rotate(${-angle}deg)` }}>
                    <img src={logo.logo} alt={logo.name} loading="lazy" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}

      {center && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">{center}</div>
      )}
    </div>
  )
}
