import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCourse } from '../lib/queries'
import { Badge, Spinner } from '../components/ui/atoms'
import { ArrowIcon, Button } from '../components/ui/Button'
import { DetailSection, MetaList, TagRow } from '../components/detail/sections'
import { titleCase } from '../lib/format'
import { EASE } from '../lib/motion'
import { NotFoundInline } from './NotFound'

const KIND_LABELS = { VIDEO: 'Video', READING: 'Reading', QUIZ: 'Quiz', PROJECT: 'Project', LIVE: 'Live' }

/** Split prose into sentences without lookbehind (unsupported in older Safari, where it is a parse error). */
const sentencesOf = (text) => (text ?? '').match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? []

function LessonRow({ lesson }) {
  return (
    <li className="flex items-center gap-3 py-2.5 text-sm">
      <span className="w-16 shrink-0 text-xs uppercase tracking-wide text-mute">
        {KIND_LABELS[lesson.kind] || titleCase(lesson.kind)}
      </span>
      {lesson.url ? (
        <a href={lesson.url} target="_blank" rel="noreferrer" className="flex-1 text-bone hover:text-acid">
          {lesson.title}
        </a>
      ) : (
        <span className="flex-1 text-bone">{lesson.title}</span>
      )}
      {lesson.durationMinutes ? <span className="text-mute">{lesson.durationMinutes}m</span> : null}
    </li>
  )
}

export default function CourseDetail() {
  const { slug } = useParams()
  const { data: c, isLoading, isError } = useCourse(slug)

  if (isLoading) {
    return (
      <div className="grid min-h-[100svh] place-items-center">
        <Spinner className="h-8 w-8 text-acid" />
      </div>
    )
  }
  if (isError || !c) return <NotFoundInline kind="course" backTo="/courses" />

  const isCompany = c.audience === 'COMPANY'
  const meta = isCompany ? c.provider : c.role
  const modules = c.modules ?? []
  const skills = c.skills ?? []
  // "What you'll learn" is a restatement of the author's own summary — never generated copy. A
  // one-sentence summary reads worse as a list of one, so it renders as prose instead.
  const outcomes = sentencesOf(c.summary)
  const learn = outcomes.length > 1 ? outcomes : []

  return (
    <article className="pb-32 pt-32 md:pt-40">
      <div className="wrap">
        <motion.div
          className="max-w-3xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <Link to="/courses" className="mb-6 inline-flex items-center gap-2 text-sm text-mute hover:text-bone">
            <ArrowIcon className="rotate-180" /> {isCompany ? 'All modules' : 'All courses'}
          </Link>
          <div className="mb-5 flex flex-wrap items-center gap-2.5">
            <Badge tone="violet">{titleCase(c.level)}</Badge>
            {c.featured && <Badge tone="open">Featured</Badge>}
            {meta && <span className="text-sm text-mute">{meta}</span>}
          </div>
          <h1 className="display-face text-balance text-huge">{c.title}</h1>
          {c.summary && <p className="mt-5 text-lede text-bone/90">{c.summary}</p>}
        </motion.div>

        {c.thumbnail?.url && (
          <div className="mt-10 aspect-[16/9] overflow-hidden rounded-2xl">
            <img src={c.thumbnail.url} alt={c.thumbnail.alt || ''} className="h-full w-full object-cover" />
          </div>
        )}

        <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-10">
            {c.description ? (
              <DetailSection>
                <div className="prose-editorial" dangerouslySetInnerHTML={{ __html: c.description }} />
              </DetailSection>
            ) : null}

            {learn.length > 0 ? (
              <DetailSection eyebrow="Outcomes" title="What you'll learn">
                <ul className="space-y-3">
                  {learn.map((line, i) => (
                    <li key={i} className="flex items-start gap-3 text-bone/90">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-acid" aria-hidden />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </DetailSection>
            ) : null}

            {modules.length > 0 ? (
              <DetailSection eyebrow="Contents" title="Curriculum">
                <div className="space-y-8">
                  {modules.map((m, i) => (
                    <section key={i} id={`module-${i + 1}`} className="scroll-mt-28">
                      <div className="flex items-baseline gap-3">
                        <span className="text-sm text-mute">{String(i + 1).padStart(2, '0')}</span>
                        <h3 className="text-lg font-semibold tracking-tight text-bone">{m.title}</h3>
                      </div>
                      {m.summary && <p className="mt-1.5 pl-9 text-sm text-mute">{m.summary}</p>}
                      {m.lessons?.length > 0 && (
                        <ul className="mt-2 divide-y divide-line/10 border-t border-line/10 pl-9">
                          {m.lessons.map((l, j) => (
                            <LessonRow key={j} lesson={l} />
                          ))}
                        </ul>
                      )}
                    </section>
                  ))}
                </div>
              </DetailSection>
            ) : null}

            {skills.length > 0 ? (
              <DetailSection eyebrow="Skills" title="Skills you'll gain">
                <TagRow tags={skills} />
              </DetailSection>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="card-surface p-6">
              <MetaList
                items={[
                  { label: 'Level', value: titleCase(c.level) },
                  isCompany && c.provider && { label: 'Provider', value: c.provider },
                  !isCompany && c.role && { label: 'Role', value: c.role },
                  { label: 'Modules', value: String(c.moduleCount ?? modules.length) },
                  { label: 'Lessons', value: String(c.lessonCount ?? 0) },
                  c.durationHours && { label: 'Duration', value: `${c.durationHours}h` },
                ]}
              />

              {c.enrollUrl && (
                <Button href={c.enrollUrl} className="mt-6 w-full" magnetic={false}>
                  Enroll <ArrowIcon />
                </Button>
              )}

              {modules.length > 0 && (
                <nav className="mt-6 border-t border-line/10 pt-6" aria-label="Modules">
                  <p className="eyebrow mb-3">Contents</p>
                  <ol className="space-y-2">
                    {modules.map((m, i) => (
                      <li key={i}>
                        <a href={`#module-${i + 1}`} className="flex gap-3 text-sm text-mute hover:text-bone">
                          <span className="tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                          <span className="min-w-0 flex-1">{m.title}</span>
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              )}
            </div>
          </aside>
        </div>
      </div>
    </article>
  )
}
