import { useState, useEffect } from 'react'
import { useSmoothScroll, ScrollTrigger } from '../lib/smooth'

import Loader from '../components/Loader'
import Navbar from '../components/Navbar'

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

      <main className="relative">
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
