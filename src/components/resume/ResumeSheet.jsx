import { normalizeResume, isResumeEmpty } from './parts'
import { resumeTemplate, resumeTemplateMeta } from './registry'

// The A4 "sheet" a resume renders onto. Templates always draw black-on-white as a
// document (theme-independent) so what shows on screen matches the printed PDF exactly.
// `sidebar` layouts render flush to the page edge, so we drop the sheet's inner padding
// for them and let the template own its own gutters.
//
// The scaling model: the sheet is authored at a fixed A4 width (`--sheet-w`) and the
// caller scales the whole thing with a CSS transform so it fits whatever column it sits
// in — that keeps every internal measurement (font sizes, padding) print-accurate.
export function ResumeSheet({ resume, id = 'resume-sheet', className = '' }) {
  const r = normalizeResume(resume)
  const meta = resumeTemplateMeta(r.template)
  const Template = resumeTemplate(r.template)
  const flush = meta.sidebar
  return (
    <div
      id={id}
      className={`resume-sheet ${flush ? 'resume-sheet-flush' : ''} ${className}`}
    >
      {isResumeEmpty(r) ? (
        <div className="grid h-full place-items-center p-16 text-center">
          <div>
            <p className="text-[15px] font-semibold text-[#333]">Your resume preview</p>
            <p className="mt-1 text-[12px] text-[#888]">Start filling in the form — it appears here live.</p>
          </div>
        </div>
      ) : (
        <Template resume={r} />
      )}
    </div>
  )
}
