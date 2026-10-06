import { Institutions } from '../sections/Institutions'
import { Voices } from '../sections/Voices'
import { Insights } from '../sections/Insights'
import { FAQ } from '../sections/FAQ'
import { FounderContact } from '../sections/FounderContact'
import { ChooseYourPathCTA } from './HomeSections'

// The shared, brand-level closing band that every ecosystem landing shares with the main
// landing page (/). Platform stats + institutions, FAQ, contact and the choose-your-path CTA
// are role-neutral and appear everywhere. The builder/student-specific proof — "What builders
// say" testimonials and the student-career "Insights & playbooks" — only makes sense on the
// builder page, so it is gated behind `builder`. The ambient grid + drifting accent backdrop
// is painted once at the page level (SiteLayout → LandingBackdrop).
export function LandingCommon({ builder = false }) {
  return (
    <>
      <Institutions />
      {builder && <Voices />}
      {builder && (
        <div id="insights" className="scroll-mt-28">
          <Insights />
        </div>
      )}
      <FAQ />
      <div id="contact" className="scroll-mt-28">
        <FounderContact />
      </div>
      <ChooseYourPathCTA />
    </>
  )
}
