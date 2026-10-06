import { useSearchParams, Link } from 'react-router-dom'
import { useCourses } from '../lib/queries'
import { Chip, Tag, Badge } from '../components/ui/atoms'
import { SearchField } from '../components/ui/SearchField'
import { Pagination } from '../components/ui/Pagination'
import { RevealGroup, RevealItem, trackSpotlight } from '../components/ui/Reveal'
import { ExploreHero, Toolbar, GridState, GridSkeletons } from '../components/explore/parts'

const AUDIENCES = [
  { key: 'STUDENT', label: 'Courses' },
  { key: 'COMPANY', label: 'Company modules' },
]
const LEVELS = [
  { key: 'BEGINNER', label: 'Beginner' },
  { key: 'INTERMEDIATE', label: 'Intermediate' },
  { key: 'ADVANCED', label: 'Advanced' },
]

// SCREAMING_SNAKE → Title Case for level/role labels.
const titleCase = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

// Deterministic accent gradient per course so placeholders feel intentional, not random.
const PLACEHOLDER_GRADIENTS = [
  'from-acid/25 to-violet/25',
  'from-violet/30 to-acid/15',
  'from-acid/20 to-flare/15',
  'from-violet/25 to-flare/20',
  'from-acid/25 to-violet/30',
]
const gradientFor = (seed = '') => {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return PLACEHOLDER_GRADIENTS[h % PLACEHOLDER_GRADIENTS.length]
}

function CourseCard({ course }) {
  const meta = course.audience === 'COMPANY' ? course.provider : course.role
  const thumb = course.thumbnail?.url
  const chips = [
    course.durationHours ? `${course.durationHours}h` : null,
    course.moduleCount ? `${course.moduleCount} module${course.moduleCount === 1 ? '' : 's'}` : null,
    course.lessonCount ? `${course.lessonCount} lesson${course.lessonCount === 1 ? '' : 's'}` : null,
  ].filter(Boolean)
  return (
    <RevealItem as="article" onMouseMove={trackSpotlight} className="group h-full">
      <Link
        to={`/courses/${course.slug}`}
        className="spotlight-card card-surface flex h-full flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1"
      >
        <div className="relative aspect-[16/9] overflow-hidden">
          {thumb ? (
            <img
              src={thumb}
              alt={course.thumbnail?.alt || course.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className={`grid h-full w-full place-items-center bg-gradient-to-br ${gradientFor(course.slug || course.title)}`}>
              <span className="display-face px-4 text-center text-lg tracking-tight text-bone/90">{course.title}</span>
            </div>
          )}
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {course.level && <Badge tone="neutral" className="backdrop-blur">{titleCase(course.level)}</Badge>}
            {course.featured && <Badge tone="soon" className="backdrop-blur">Featured</Badge>}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-5">
          {meta && <span className="truncate text-[11px] font-medium uppercase tracking-widest text-acid">{meta}</span>}
          <h3 className="mt-1.5 text-lg font-semibold leading-tight text-bone transition-colors group-hover:text-acid">
            {course.title}
          </h3>
          {course.summary && <p className="mt-2 line-clamp-2 text-sm text-mute">{course.summary}</p>}
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
            {chips.map((c) => (
              <Tag key={c}>{c}</Tag>
            ))}
            <span className="ml-auto text-sm text-acid opacity-0 transition-opacity group-hover:opacity-100">View →</span>
          </div>
        </div>
      </Link>
    </RevealItem>
  )
}

export default function Courses() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const audience = params.get('audience') || 'STUDENT'
  const level = params.get('level') || ''
  const sort = params.get('sort') || (q ? 'relevance' : 'newest')
  const page = Number(params.get('page')) || 1

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  const { data, isLoading, isError, refetch, isPlaceholderData } = useCourses({
    q: q || undefined,
    audience,
    level: level || undefined,
    sort,
    page,
    pageSize: 12,
  })

  const items = data?.items || []
  const meta = data?.meta
  const total = meta?.total ?? items.length
  const isCompany = audience === 'COMPANY'

  return (
    <>
      <ExploreHero
        eyebrow="Learn · AI · Development · Career systems"
        title="Master real skills, not just courses."
        lead="Learn from curated, industry-grade modules built for real-world outcomes — internships, projects and hiring readiness."
      >
        <SearchField
          value={q}
          onSearch={(v) => setParam('q', v)}
          placeholder={isCompany ? 'Search company modules…' : 'Search courses…'}
        />
      </ExploreHero>

      <div className="wrap py-10">
        <div className="mb-8 flex flex-col gap-5 border-b border-line/10 pb-8">
          <div className="flex flex-wrap items-center gap-2.5">
            {AUDIENCES.map((a) => (
              <Chip key={a.key} active={audience === a.key} onClick={() => setParam('audience', a.key)}>
                {a.label}
              </Chip>
            ))}
            <span className="mx-1 hidden h-5 w-px bg-line/15 sm:block" />
            <span className="hidden text-sm text-mute sm:inline">Level</span>
            <Chip active={!level} onClick={() => setParam('level', '')}>
              All
            </Chip>
            {LEVELS.map((l) => (
              <Chip key={l.key} active={level === l.key} onClick={() => setParam('level', level === l.key ? '' : l.key)}>
                {l.label}
              </Chip>
            ))}
          </div>
          <p className="text-sm text-mute">
            {isCompany
              ? 'Institutional training modules from partner organisations.'
              : 'Role-focused tracks that take you from fundamentals to engineering-readiness.'}
          </p>
        </div>

        <GridState
          isLoading={isLoading}
          isError={isError}
          isEmpty={items.length === 0}
          onRetry={refetch}
          skeleton={<GridSkeletons count={6} itemClassName="aspect-[4/5]" />}
          emptyTitle={`No ${isCompany ? 'modules' : 'courses'} found.`}
          emptyHint="Try a different level or search term."
        >
          <p className="mb-8 text-sm text-mute">
            {total} result{total === 1 ? '' : 's'}
          </p>
          <RevealGroup className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${isPlaceholderData ? 'opacity-60' : ''}`}>
            {items.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </RevealGroup>
          <Pagination page={page} totalPages={meta?.totalPages || 1} onChange={(p) => setParam('page', String(p))} />
        </GridState>
      </div>
    </>
  )
}
