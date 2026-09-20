import { useRef, useLayoutEffect } from 'react'
import { gsap } from '../lib/smooth'

/**
 * Loader — count 000→100 with a word-shuffle, then slide the panels away
 * and fire onDone so the hero can play in.
 *
 * Note: all ref reads are null-guarded and the node is hidden (not unmounted)
 * on completion, so StrictMode's double-invoke / re-renders can never fire a
 * GSAP callback against a detached ref (which would crash the whole tree).
 */
const WORDS = ['BUILD', 'SHIP', 'DISCOVER', 'STUDLYF']

export default function Loader({ onDone }) {
  const root = useRef(null)
  const counter = useRef(null)
  const word = useRef(null)
  const done = useRef(false)
  // Keep the latest onDone without re-running the animation effect when the
  // parent re-renders (which happens the instant we fire onDone).
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useLayoutEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Wake the hero the instant the panels start revealing it, so its
    // "Learn / by doing" reveal plays in sync with the reveal — not ~1s later.
    const reveal = () => {
      if (done.current) return
      done.current = true
      onDoneRef.current?.()
    }
    // Hide the loader node only once every animation has finished.
    const hide = () => {
      if (root.current) root.current.style.display = 'none'
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: hide })

      if (reduce) {
        if (counter.current) counter.current.textContent = '100'
        tl.to(root.current, { autoAlpha: 0, duration: 0.4, delay: 0.25, onStart: reveal })
        return
      }

      const count = { v: 0 }
      tl.to(count, {
        v: 100,
        duration: 2.1,
        ease: 'power2.inOut',
        onUpdate: () => {
          if (counter.current) counter.current.textContent = String(Math.round(count.v)).padStart(3, '0')
        },
      })

      WORDS.forEach((w, i) => {
        tl.call(() => { if (word.current) word.current.textContent = w }, null, i * 0.5)
      })

      tl.to('.loader-bar', { scaleX: 1, duration: 2.1, ease: 'power2.inOut' }, 0)
      tl.to('.loader-meta', { autoAlpha: 0, duration: 0.4 }, '+=0.15')
      tl.to('.loader-panel', {
        yPercent: -100,
        duration: 1,
        ease: 'power4.inOut',
        stagger: 0.08,
        onStart: reveal,
      }, '-=0.1')
    }, root.current)

    return () => ctx.revert()
    // Run the loader animation exactly once — never restart it when the parent
    // re-renders after onDone fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={root} className="fixed inset-0 z-[200] pointer-events-none">
      <div className="absolute inset-0 flex">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="loader-panel flex-1 bg-ink" />
        ))}
      </div>
      <div className="loader-meta absolute inset-0 flex flex-col justify-between gutter py-8">
        <div className="flex items-center justify-between eyebrow text-bone2">
          <span>STUDLYF®</span>
          <span>EST. 2026 — DIGITAL ECOSYSTEM</span>
        </div>
        <div className="flex items-end justify-between">
          <span ref={word} className="font-display d-2 text-bone">BUILD</span>
          <span ref={counter} className="font-display d-2 text-acid tabular-nums">000</span>
        </div>
        <div className="mt-6 h-px w-full bg-bone/15 origin-left">
          <div className="loader-bar h-full w-full bg-acid origin-left scale-x-0" />
        </div>
      </div>
    </div>
  )
}
