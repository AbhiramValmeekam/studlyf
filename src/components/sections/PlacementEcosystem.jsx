import { SectionHeading } from '../ui/SectionHeading'
import { ParallaxFeatures } from '../ui/ParallaxFeatures'
import { pillars } from '../../data/studlyf'

// The four pillars as scroll-reveal parallax rows — each pillar's copy drifts up
// and its image wipes in as you scroll, alternating left/right. Numbered 01–04.
// Custom topic illustrations, one per pillar (in /public/imported).
const pillarImages = [
  '/imported/learning-paths.png', // Learning Paths — the Learning Paths dashboard
  '/imported/mock-interviews.png', // Mock Interviews — a mock interview in progress
  '/imported/career-dreamer.png', // Career Dreamer — a goals & plans notebook
  '/imported/placement-ecosystem.png', // Placement Ecosystem — students, companies, mentors, opportunities
]

const features = pillars.map((p, i) => ({
  no: p.no,
  title: p.title,
  description: p.desc,
  image: pillarImages[i],
}))

export function PlacementEcosystem() {
  return (
    <section className="relative py-28 md:py-36">
      <div className="wrap">
        <SectionHeading
          eyebrow="Ecosystem"
          title="Everything in one platform."
          aside={
            <p className="text-mute">
              Learning, AI mock interviews, mentorship and real opportunities — connected from your first commit to your final offer.
            </p>
          }
        />
      </div>

      <div className="mt-10">
        <ParallaxFeatures features={features} />
      </div>
    </section>
  )
}
