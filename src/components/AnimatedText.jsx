import { useRef, useLayoutEffect } from 'react'
import { gsap, ScrollTrigger } from '../lib/smooth'

/**
 * RevealText — splits into lines by explicit line breaks (array of strings)
 * and reveals each line with a masked upward slide on scroll.
 */
export function RevealText({
  lines,
  as: Tag = 'div',
  className = '',
  delay = 0,
  stagger = 0.09,
  start = 'top 85%',
}) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const el = ref.current
    const inners = el.querySelectorAll('.line-inner')
    const ctx = gsap.context(() => {
      gsap.set(inners, { yPercent: 115 })
      gsap.to(inners, {
        yPercent: 0,
        duration: 1.05,
        ease: 'power4.out',
        stagger,
        delay,
        scrollTrigger: { trigger: el, start },
      })
    }, el)
    return () => ctx.revert()
  }, [delay, stagger, start])

  return (
    <Tag ref={ref} className={className}>
      {lines.map((ln, i) => (
        <span className="line-mask" key={i}>
          <span className="line-inner">{ln}</span>
        </span>
      ))}
    </Tag>
  )
}

/**
 * FadeUp — generic scroll-in for any block.
 */
export function FadeUp({ children, className = '', y = 40, delay = 0, start = 'top 88%' }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y },
        {
          autoAlpha: 1,
          y: 0,
          duration: 1,
          ease: 'power3.out',
          delay,
          scrollTrigger: { trigger: el, start },
        },
      )
    }, el)
    return () => ctx.revert()
  }, [y, delay, start])
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

/**
 * CharFlip — hover word that flips characters (used in nav/links).
 */
export function CharFlip({ text, className = '' }) {
  return (
    <span className={`charflip ${className}`}>
      <span className="cf-line">{text}</span>
      <span className="cf-line cf-clone" aria-hidden>
        {text}
      </span>
    </span>
  )
}

export { ScrollTrigger }
