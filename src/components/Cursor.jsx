import { useEffect, useRef } from 'react'

/**
 * Custom cursor: a lagging ring + instant dot.
 * Grows and labels on elements marked [data-cursor] / [data-cursor-label].
 */
export default function Cursor() {
  const ring = useRef(null)
  const dot = useRef(null)
  const label = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return
    const ringEl = ring.current
    const dotEl = dot.current
    const labelEl = label.current

    let mx = window.innerWidth / 2
    let my = window.innerHeight / 2
    let rx = mx
    let ry = my
    let raf

    const move = (e) => {
      mx = e.clientX
      my = e.clientY
      dotEl.style.transform = `translate3d(${mx}px, ${my}px, 0)`

      const t = e.target.closest('[data-cursor]')
      if (t) {
        ringEl.dataset.state = t.getAttribute('data-cursor') || 'hover'
        labelEl.textContent = t.getAttribute('data-cursor-label') || ''
      } else {
        ringEl.dataset.state = ''
        labelEl.textContent = ''
      }
    }

    const loop = () => {
      rx += (mx - rx) * 0.15
      ry += (my - ry) * 0.15
      ringEl.style.transform = `translate3d(${rx}px, ${ry}px, 0)`
      raf = requestAnimationFrame(loop)
    }

    const down = () => (ringEl.dataset.down = '1')
    const up = () => (ringEl.dataset.down = '')

    window.addEventListener('mousemove', move)
    window.addEventListener('mousedown', down)
    window.addEventListener('mouseup', up)
    loop()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mousedown', down)
      window.removeEventListener('mouseup', up)
    }
  }, [])

  return (
    <>
      <div ref={dot} className="cursor-dot" aria-hidden />
      <div ref={ring} className="cursor-ring" aria-hidden>
        <span ref={label} className="cursor-label" />
      </div>
      <style>{`
        .cursor-dot, .cursor-ring {
          position: fixed; top: 0; left: 0; z-index: 100;
          pointer-events: none; will-change: transform;
          margin-left: -0px; margin-top: -0px;
        }
        .cursor-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--acid); margin: -3px 0 0 -3px;
          mix-blend-mode: difference;
        }
        .cursor-ring {
          width: 42px; height: 42px; border-radius: 50%;
          border: 1px solid color-mix(in srgb, var(--bone) 55%, transparent);
          margin: -21px 0 0 -21px;
          display: grid; place-items: center;
          transition: width .35s var(--ease), height .35s var(--ease),
                      background .35s var(--ease), border-color .35s var(--ease);
        }
        .cursor-ring[data-down="1"] { transform-origin: center; }
        .cursor-ring[data-state="view"],
        .cursor-ring[data-state="drag"],
        .cursor-ring[data-state="hover"] {
          width: 84px; height: 84px; margin: -42px 0 0 -42px;
          background: var(--acid); border-color: transparent;
        }
        .cursor-label {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 11px; font-weight: 600; letter-spacing: .06em;
          text-transform: uppercase; color: var(--ink); opacity: 0;
          transition: opacity .3s var(--ease);
        }
        .cursor-ring[data-state] .cursor-label { opacity: 1; }
        @media (pointer: coarse) { .cursor-dot, .cursor-ring { display: none; } }
      `}</style>
    </>
  )
}
