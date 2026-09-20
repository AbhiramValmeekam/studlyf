import { useRef, useLayoutEffect } from 'react'
import Matter from 'matter-js'

/**
 * LogoPit — a moncy.dev-style physics "ball pit". Each logo lives inside a
 * circular body that falls under gravity and piles up at the bottom. The
 * cursor is a solid body too, so dragging it through the pile shoves the balls
 * apart; they tumble and settle back together once you move away. Balls are
 * also grabbable/throwable via a mouse constraint.
 *
 * Rendering: matter-js runs the simulation headlessly; we sync each body's
 * position/rotation onto a real DOM node every frame so the logos stay crisp.
 *
 * Falls back to a static grid under prefers-reduced-motion.
 *
 * @param logos  [{ name, img }]
 * @param tone   'light' balls on a dark section, 'dark' balls on a light one
 */
export default function LogoPit({ logos, tone = 'dark', className = '' }) {
  const scene = useRef(null)
  const ballRefs = useRef([])
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useLayoutEffect(() => {
    const el = scene.current
    if (!el || reduce) return

    const { Engine, Runner, Bodies, Body, Composite, Mouse, MouseConstraint, Events } = Matter

    let W = el.clientWidth
    let H = el.clientHeight

    // ball diameter scales with viewport; smaller when there are many logos
    const base = Math.min(W, H)
    const R = Math.max(30, Math.min(56, (base / 9) * (24 / Math.max(logos.length, 12))))

    const engine = Engine.create()
    engine.gravity.y = 1
    const world = engine.world

    const wallOpts = { isStatic: true, restitution: 0.4, friction: 0.3 }
    const T = 200 // thick walls so fast bodies can't tunnel out
    const walls = [
      Bodies.rectangle(W / 2, H + T / 2, W + T * 2, T, wallOpts), // floor
      Bodies.rectangle(-T / 2, H / 2, T, H * 3, wallOpts), // left
      Bodies.rectangle(W + T / 2, H / 2, T, H * 3, wallOpts), // right
      Bodies.rectangle(W / 2, -H - T, W + T * 2, T, wallOpts), // high ceiling
    ]
    Composite.add(world, walls)

    // one circular body per logo, dropped from staggered heights
    const balls = logos.map((_, i) =>
      Bodies.circle(
        R + Math.random() * (W - 2 * R),
        -R * 2 - Math.random() * H,
        R,
        {
          restitution: 0.55,
          friction: 0.06,
          frictionAir: 0.02,
          density: 0.0016,
        },
      ),
    )
    Composite.add(world, balls)

    // mouse: grab/throw + acts as a solid pusher via repel force below
    const mouse = Mouse.create(el)
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: 0.15, render: { visible: false } },
    })
    Composite.add(world, mouseConstraint)
    // let the page still scroll over the pit
    el.removeEventListener('wheel', mouse.mousewheel)
    el.removeEventListener('DOMMouseScroll', mouse.mousewheel)

    // cursor repulsion — push nearby balls away from the pointer
    let pointer = { x: -9999, y: -9999, active: false }
    const toLocal = (e) => {
      const r = el.getBoundingClientRect()
      pointer.x = e.clientX - r.left
      pointer.y = e.clientY - r.top
      pointer.active = true
    }
    const clearPointer = () => (pointer.active = false)
    el.addEventListener('pointermove', toLocal)
    el.addEventListener('pointerleave', clearPointer)

    Events.on(engine, 'beforeUpdate', () => {
      if (!pointer.active) return
      const reach = R * 3.2
      for (const b of balls) {
        const dx = b.position.x - pointer.x
        const dy = b.position.y - pointer.y
        const dist = Math.hypot(dx, dy) || 0.0001
        if (dist < reach) {
          const strength = (1 - dist / reach) * 0.06 * b.mass
          Body.applyForce(b, b.position, {
            x: (dx / dist) * strength,
            y: (dy / dist) * strength,
          })
        }
      }
    })

    // sync bodies → DOM every frame
    Events.on(engine, 'afterUpdate', () => {
      for (let i = 0; i < balls.length; i++) {
        const node = ballRefs.current[i]
        if (!node) continue
        const { x, y } = balls[i].position
        node.style.transform = `translate(${x - R}px, ${y - R}px) rotate(${balls[i].angle}rad)`
      }
    })

    // size the DOM balls
    for (const node of ballRefs.current) {
      if (node) {
        node.style.width = `${R * 2}px`
        node.style.height = `${R * 2}px`
      }
    }

    const runner = Runner.create()
    Runner.run(runner, engine)

    // keep the pit sized to its container
    const onResize = () => {
      const nw = el.clientWidth
      const nh = el.clientHeight
      if (nw === W && nh === H) return
      W = nw
      H = nh
      Body.setPosition(walls[0], { x: W / 2, y: H + T / 2 })
      Body.setPosition(walls[1], { x: -T / 2, y: H / 2 })
      Body.setPosition(walls[2], { x: W + T / 2, y: H / 2 })
      Body.setPosition(walls[3], { x: W / 2, y: -H - T })
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(el)

    return () => {
      ro.disconnect()
      el.removeEventListener('pointermove', toLocal)
      el.removeEventListener('pointerleave', clearPointer)
      Runner.stop(runner)
      Events.off(engine)
      Composite.clear(world, false)
      Engine.clear(engine)
    }
  }, [logos])

  const chip =
    tone === 'dark'
      ? 'bg-white shadow-[0_8px_24px_-6px_rgba(0,0,0,0.45)]'
      : 'bg-white shadow-[0_10px_30px_-8px_rgba(20,20,30,0.35)]'

  // Reduced motion: no physics — lay the logo chips out in a calm centered wrap.
  if (reduce) {
    return (
      <div className={`flex flex-wrap items-center justify-center gap-4 py-10 ${className}`}>
        {logos.map((l) => (
          <span key={l.name} className={`grid place-items-center rounded-full h-20 w-20 ${chip}`}>
            <img src={l.img} alt={l.name} className="w-[58%] h-[58%] object-contain" />
          </span>
        ))}
      </div>
    )
  }

  return (
    <div ref={scene} className={`relative overflow-hidden touch-pan-y ${className}`}>
      {logos.map((l, i) => (
        <span
          key={l.name}
          ref={(n) => (ballRefs.current[i] = n)}
          className={`absolute top-0 left-0 grid place-items-center rounded-full will-change-transform select-none cursor-grab active:cursor-grabbing ${chip}`}
          data-cursor="drag"
          data-cursor-label="Push"
        >
          <img
            src={l.img}
            alt={l.name}
            draggable={false}
            className="w-[58%] h-[58%] object-contain pointer-events-none"
          />
        </span>
      ))}
    </div>
  )
}
