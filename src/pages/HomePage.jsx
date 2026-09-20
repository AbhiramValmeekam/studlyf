import { useState, useEffect } from 'react'
import { useSmoothScroll, ScrollTrigger } from '../lib/smooth'

import Loader from '../components/Loader'
import Navbar from '../components/Navbar'
import LightRays from '../components/LightRays'

import Hero from '../sections/Hero'
import Ecosystem from '../sections/Ecosystem'
import EntryPoints from '../sections/EntryPoints'
import Builders from '../sections/Builders'
import Projects from '../sections/Projects'
import Opportunities from '../sections/Opportunities'
import Founders from '../sections/Founders'
import Investors from '../sections/Investors'
import Talent from '../sections/Talent'
import Resources from '../sections/Resources'
import Contact from '../sections/Contact'
import Footer from '../sections/Footer'

/**
 * HomePage — the public STUDLYF marketing site. Keeps all the single-page
 * chrome (Loader intro, Lenis smooth scroll, ball-pit hero). The ecosystem
 * app routes deliberately do NOT use this chrome.
 */
export default function HomePage() {
  const [ready, setReady] = useState(false)
  useSmoothScroll(true)

  useEffect(() => {
    if (!ready) return
    const t = setTimeout(() => ScrollTrigger.refresh(), 120)
    document.fonts?.ready?.then(() => ScrollTrigger.refresh())
    return () => clearTimeout(t)
  }, [ready])

  return (
    <>
      <Loader onDone={() => setReady(true)} />
      <Navbar ready={ready} />

      <LightRays
        className="light-rays-bg"
        raysOrigin="top-center"
        raysColor="#c7f24e"
        raysSpeed={1.1}
        lightSpread={0.9}
        rayLength={1.6}
        followMouse
        mouseInfluence={0.08}
        noiseAmount={0.08}
        distortion={0.04}
        fadeDistance={1.1}
        saturation={0.9}
      />

      <main className="relative z-10">
        <Hero play={ready} />
        <EntryPoints />
        <Ecosystem />
        <Builders />
        <Projects />
        <Opportunities />
        <Founders />
        <Investors />
        <Talent />
        <Resources />
        <Contact />
        <Footer />
      </main>
    </>
  )
}
