import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Adapted from a 21st.dev coverflow carousel for this Vite + JSX + Tailwind
// project (no shadcn / TypeScript): `cn` becomes the local `cx`, shadcn tokens
// (bg-muted / text-foreground / …) become the project's ink/bone/line tokens.
// Added: optional auto-play (paused on hover, drag, or hidden tab) and a quote
// line under the active card. The tilt/paint/settle logic is unchanged.
const cx = (...classes) => classes.filter(Boolean).join(' ')

const useIsoLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect

export function CoverflowCarousel({
  slides,
  rotate = 44,
  depth = 0.6,
  perspective = 3,
  falloff = 0.56,
  fade = 0.1,
  cardWidth = 'clamp(148px, 22vw, 260px)',
  gap = 0.05,
  loop = true,
  showCaption = false,
  showPagination = false,
  showNavigation = false,
  autoPlay = false,
  interval = 3200,
  label = 'Cover carousel',
  className,
  cardClassName,
}) {
  const count = slides.length

  const frameRef = React.useRef(null)
  const cardRefs = React.useRef([])
  const posRef = React.useRef(0)
  const targetRef = React.useRef(0)
  const widthRef = React.useRef(0)
  const rafRef = React.useRef(null)
  const dragRef = React.useRef(null)
  // Auto-play pauses while the pointer is down or hovering, and while hidden.
  const [paused, setPaused] = React.useState(false)

  const [selected, setSelected] = React.useState(0)

  const indexAt = React.useCallback(
    (pos) => ((Math.round(pos) % count) + count) % count,
    [count],
  )

  // Paint straight to the DOM. Sixty state updates a second would re-render
  // every card for numbers React never needs to see.
  const paint = React.useCallback(() => {
    const width = widthRef.current
    if (!width) return
    const pitch = width * (1 + gap)
    const pos = posRef.current

    cardRefs.current.forEach((card, index) => {
      if (!card) return

      // Fold the distance into the shorter way round the ring — the whole
      // looping mechanism, no cloned nodes, no shuffling the DOM.
      let offset = index - pos
      if (loop) {
        offset = ((offset % count) + count) % count
        if (offset > count / 2) offset -= count
      }

      const distance = Math.abs(offset)
      const ramp = Math.pow(distance, falloff)
      const tilt = Math.min(rotate * ramp, 82) * Math.sign(offset)

      card.style.transform =
        `translateX(calc(-50% + ${offset * pitch}px)) ` +
        `translateZ(${-depth * width * ramp}px) rotateY(${-tilt}deg)`

      const edge = loop ? Math.min(1, Math.max(0, count / 2 - distance)) : 1
      card.style.opacity = String(Math.max(0, 1 - fade * distance) * edge)
      card.style.zIndex = String(100 - Math.round(distance))
    })
  }, [count, depth, fade, falloff, gap, loop, rotate])

  const settle = React.useCallback(
    (target) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      targetRef.current = target
      setSelected(indexAt(target))

      const step = () => {
        const remaining = target - posRef.current
        if (Math.abs(remaining) < 0.0004) {
          posRef.current = target
          paint()
          rafRef.current = null
          return
        }
        posRef.current += remaining * 0.16
        paint()
        rafRef.current = requestAnimationFrame(step)
      }
      rafRef.current = requestAnimationFrame(step)
    },
    [indexAt, paint],
  )

  const clamp = React.useCallback(
    (pos) => (loop ? pos : Math.max(0, Math.min(count - 1, pos))),
    [count, loop],
  )

  const goTo = React.useCallback(
    (index) => {
      const target = loop
        ? index + Math.round((targetRef.current - index) / count) * count
        : index
      settle(clamp(target))
    },
    [clamp, count, loop, settle],
  )

  const nudge = React.useCallback(
    (by) => settle(clamp(Math.round(targetRef.current) + by)),
    [clamp, settle],
  )

  const onPointerDown = (event) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    setPaused(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    targetRef.current = posRef.current
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      pos: posRef.current,
      v: 0,
      t: performance.now(),
    }
  }

  const onPointerMove = (event) => {
    const drag = dragRef.current
    if (!drag || drag.id !== event.pointerId) return

    const pitch = widthRef.current * (1 + gap)
    if (!pitch) return

    const now = performance.now()
    const previous = posRef.current
    posRef.current = clamp(drag.pos - (event.clientX - drag.x) / pitch)
    drag.v = ((posRef.current - previous) / Math.max(now - drag.t, 1)) * 1000
    drag.t = now

    const index = indexAt(posRef.current)
    if (index !== selected) setSelected(index)
    paint()
  }

  const endDrag = (event) => {
    const drag = dragRef.current
    if (!drag || drag.id !== event.pointerId) return
    dragRef.current = null
    // Let a flick carry, but never more than two cards.
    const carried = Math.max(-2, Math.min(2, drag.v * 0.18))
    settle(clamp(Math.round(posRef.current + carried)))
  }

  // Card width drives pitch, depth and perspective, so it is the only thing
  // worth measuring — and only when the box actually changes.
  useIsoLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame) return

    const measure = () => {
      const card = cardRefs.current[0]
      if (!card) return
      widthRef.current = card.offsetWidth
      paint()
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [paint])

  React.useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    },
    [],
  )

  // Auto-advance. Respects reduced-motion, and holds while paused (hover /
  // drag) or when the tab is hidden so it doesn't race ahead off-screen.
  React.useEffect(() => {
    if (!autoPlay || count <= 1) return
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    let id = null
    const tick = () => {
      if (!paused && !document.hidden) nudge(1)
    }
    const start = () => {
      if (id === null) id = window.setInterval(tick, interval)
    }
    const stop = () => {
      if (id !== null) {
        window.clearInterval(id)
        id = null
      }
    }
    start()
    document.addEventListener('visibilitychange', stop)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', stop)
    }
  }, [autoPlay, count, interval, paused, nudge])

  const active = slides[selected]

  return (
    <div
      className={cx('w-full', className)}
      style={{ '--cf-card': cardWidth }}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
    >
      <div className="relative">
        <div
          ref={frameRef}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault()
              nudge(-1)
            } else if (event.key === 'ArrowRight') {
              event.preventDefault()
              nudge(1)
            }
          }}
          // Vertical padding keeps the drop shadows clear of the overflow clip.
          className="cursor-grab overflow-hidden py-10 outline-none focus-visible:ring-2 focus-visible:ring-acid active:cursor-grabbing"
          style={{
            perspective: `calc(var(--cf-card) * ${perspective})`,
            // Horizontal drag is ours; the page keeps vertical scrolling.
            touchAction: 'pan-y',
          }}
        >
          <div
            className="relative select-none"
            style={{ height: 'var(--cf-card)', transformStyle: 'preserve-3d' }}
          >
            {slides.map((slide, index) => (
              <div
                key={index}
                ref={(node) => {
                  cardRefs.current[index] = node
                }}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${count}`}
                className={cx(
                  'absolute left-1/2 top-0 aspect-square overflow-hidden rounded-2xl bg-ink2 shadow-xl will-change-transform',
                  cardClassName,
                )}
                style={{ width: 'var(--cf-card)' }}
              >
                {/* Full-bleed portrait (or an initials fallback for a missing photo). */}
                {slide.src ? (
                  <img
                    src={slide.src}
                    alt={slide.alt}
                    draggable={false}
                    className="absolute inset-0 h-full w-full select-none object-cover"
                    style={slide.objectPosition ? { objectPosition: slide.objectPosition } : undefined}
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-ink3 to-ink2">
                    <span className="font-display text-6xl text-line/20">
                      {(slide.title || '?').slice(0, 1)}
                    </span>
                  </div>
                )}

                {/* Dark scrim at the foot carrying the pull-quote and attribution. */}
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 bg-gradient-to-t from-black/90 via-black/65 to-transparent px-6 pb-6 pt-24 text-center">
                  <span aria-hidden className="-mb-5 font-serif text-6xl italic leading-none text-acid/90">
                    “
                  </span>
                  {slide.quote && (
                    <blockquote className="text-balance font-serif text-base italic leading-snug text-white md:text-lg">
                      {slide.quote}
                    </blockquote>
                  )}
                  {slide.title && (
                    <p className="mt-1 font-serif text-xs italic text-white/70">
                      — {slide.title}
                      {slide.subtitle ? `, ${slide.subtitle}` : ''}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {showNavigation && (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => nudge(-1)}
              className="absolute left-3 top-1/2 z-[200] -translate-y-1/2 rounded-full bg-ink2/70 p-2 text-bone backdrop-blur transition hover:bg-ink2"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => nudge(1)}
              className="absolute right-3 top-1/2 z-[200] -translate-y-1/2 rounded-full bg-ink2/70 p-2 text-bone backdrop-blur transition hover:bg-ink2"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>

      {showCaption && active?.title && (
        <div
          key={selected}
          className="mx-auto mt-6 flex max-w-xl flex-col items-center px-6 text-center"
        >
          <p className="text-lg font-semibold tracking-tight text-bone">{active.title}</p>
          {active.subtitle && <p className="mt-1 text-sm text-mute">{active.subtitle}</p>}
          {active.meta && active.meta.length > 0 && (
            <dl className="mt-6 w-full max-w-[230px] text-[12px]">
              {active.meta.map((row) => (
                <div key={row.label} className="flex justify-between py-[5px]">
                  <dt className="text-mute">{row.label}</dt>
                  <dd className="font-medium text-bone">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}

      {showPagination && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === selected}
              onClick={() => goTo(index)}
              className={cx(
                'size-2 rounded-full bg-bone transition-opacity',
                index === selected ? 'opacity-100' : 'opacity-30',
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}

