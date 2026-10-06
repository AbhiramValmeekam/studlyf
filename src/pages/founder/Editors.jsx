import { Link, useSearchParams } from 'react-router-dom'
import { FUNDING_STAGES, FOUNDER_VISIBILITIES, STARTUP_STAGES, STARTUP_TYPES } from '../../lib/enums'
import { useHashScroll } from '../../lib/useHashScroll'
import { Notice, ProductPage, QueryState } from '../../components/ecosystem/product'
import { Area, Choice, NumberField, SaveRow, Text, Toggle, clean, getPath, setPath, useForm } from '../../components/ecosystem/forms'
import { Button } from '../../components/ui/Button'
import { FormField, Input, Textarea } from '../../components/ui/Field'
import { useFounderProfile, useSaveFounder } from './shared'

function useEditor(pick) {
  const q = useFounderProfile()
  const save = useSaveFounder()
  const form = useForm(q.data ? pick(q.data) : {})
  const submit = (e) => {
    e.preventDefault()
    form.run((v) => save(clean(v)))
  }
  return { q, form, submit }
}

/** '' and whitespace mean "no value" to the API, so send null instead. */
const nil = (v) => String(v ?? '').trim() || null

export function FounderProfilePage() {
  const { q, form, submit } = useEditor((p) => ({
    headline: p.headline,
    bio: p.bio,
    linkedin: p.linkedin,
    location: p.location,
    discoverable: p.discoverable,
    slug: p.slug,
    visibility: p.visibility,
  }))
  const slug = q.data?.slug
  const isPublic = getPath(form.values, 'visibility') === 'PUBLIC'
  return (
    <ProductPage eco="FOUNDER" title="Founder profile" subtitle="Who you are and why you’re building this. Investors see this next to your startup.">
      <QueryState query={q}>
        <form onSubmit={submit} className="card-surface max-w-3xl space-y-5 p-6 md:p-8" noValidate>
          <Text form={form} path="headline" label="Headline" />
          <Area form={form} path="bio" label="Bio" rows={5} hint="Previous builds, relevant experience, why this problem." />
          <div className="grid gap-5 md:grid-cols-2">
            <Text form={form} path="linkedin" label="LinkedIn URL" type="url" />
            <Text form={form} path="location" label="Location" />
          </div>
          <Toggle form={form} path="discoverable" label="Discoverable by verified investors" hint="When off, your founder and startup profile never appear in investor discovery." />
          <Choice
            form={form}
            path="visibility"
            label="Startup page visibility"
            options={FOUNDER_VISIBILITIES}
            hint="Public pages can be opened by anyone with the link. Investor-only keeps your startup inside verified investor discovery."
          />
          <Text
            form={form}
            path="slug"
            label="Public handle"
            hint={slug ? `Your page lives at /founders/${slug} — changing it breaks any link already shared.` : 'Generated from your startup name.'}
          />
          <SaveRow form={form} />
        </form>

        {isPublic && slug && (
          <p className="mt-6 text-sm text-mute">
            Your startup page is live at{' '}
            <Link to={`/founders/${slug}`} className="text-amber-300 hover:underline">
              /founders/{slug}
            </Link>
            .
          </p>
        )}
      </QueryState>
    </ProductPage>
  )
}

export function StartupPage() {
  useHashScroll()
  const { q, form, submit } = useEditor((p) => ({ startup: { ...p.startup, traction: undefined, tractionHistory: undefined } }))
  return (
    <ProductPage eco="FOUNDER" title="Startup profile" subtitle="The structured profile investors filter by — stage, industry, type, team and product.">
      <QueryState query={q}>
        <form onSubmit={submit} className="card-surface max-w-4xl space-y-5 p-6 md:p-8" noValidate>
          <div className="grid gap-5 md:grid-cols-2">
            <Text form={form} path="startup.name" label="Startup name" required />
            <Text form={form} path="startup.website" label="Website" type="url" />
          </div>
          <Area form={form} path="startup.oneLiner" label="One-liner" rows={2} required />
          <Area form={form} path="startup.description" label="Product — what it does" rows={5} hint="Feeds the Product readiness area." />
          <div className="grid gap-5 md:grid-cols-3">
            <Text form={form} path="startup.industry" label="Industry" />
            <Choice form={form} path="startup.type" label="Startup type" options={STARTUP_TYPES} />
            <Text form={form} path="startup.location" label="Location" />
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <Choice form={form} path="startup.stage" label="Stage" options={STARTUP_STAGES} />
            <Choice form={form} path="startup.fundingStage" label="Funding stage" options={FUNDING_STAGES} />
            <NumberField form={form} path="startup.foundedYear" label="Founded" min={1990} max={2100} />
          </div>
          <div id="team" className="scroll-mt-32 grid gap-5 md:grid-cols-[10rem_1fr]">
            <NumberField form={form} path="startup.teamSize" label="Team size" min={1} />
            <Area form={form} path="startup.teamDescription" label="Team" rows={3} hint="Co-founders and key people. Feeds the Team readiness area." />
          </div>
          <SaveRow form={form} />
        </form>
      </QueryState>
    </ProductPage>
  )
}

const BLANK_TRACTION = () => ({ date: '', users: '', revenue: '', growth: '', note: '' })

function TractionPage() {
  const q = useFounderProfile()
  const save = useSaveFounder()
  const form = useForm(q.data ? { startup: { traction: q.data.startup.traction, tractionHistory: q.data.startup.tractionHistory } } : {})
  const submit = (e) => {
    e.preventDefault()
    form.run((v) =>
      save({
        startup: {
          traction: {
            users: nil(v.startup.traction?.users),
            revenue: nil(v.startup.traction?.revenue),
            growth: nil(v.startup.traction?.growth),
            highlights: nil(v.startup.traction?.highlights),
          },
          // A snapshot without a date has nothing to sort by — drop it rather than fail the save.
          tractionHistory: (v.startup.tractionHistory ?? [])
            .filter((p) => p.date)
            .map((p) => ({ date: p.date, users: nil(p.users), revenue: nil(p.revenue), growth: nil(p.growth), note: nil(p.note) })),
        },
      }),
    )
  }
  return (
    <ProductPage eco="FOUNDER" title="Traction" subtitle="Numbers and proof points in your own words. Shown to verified investors in discovery.">
      <QueryState query={q}>
        <form onSubmit={submit} className="max-w-3xl space-y-6" noValidate>
          <div className="card-surface space-y-5 p-6 md:p-8">
            <div className="grid gap-5 md:grid-cols-2">
              <Text form={form} path="startup.traction.users" label="Users / customers" placeholder="e.g. 1,800 farmers across 3 districts" />
              <Text form={form} path="startup.traction.revenue" label="Revenue" placeholder="e.g. ₹2.1L MRR" />
            </div>
            <Text form={form} path="startup.traction.growth" label="Growth" placeholder="e.g. 32% month-on-month since March" />
            <Area form={form} path="startup.traction.highlights" label="Highlights" rows={4} placeholder="Pilots, partnerships, awards, press." />
          </div>

          <div className="card-surface space-y-5 p-6 md:p-8">
            <Repeater
              form={form}
              path="startup.tractionHistory"
              title="Traction history"
              hint="One row per moment you measured. The summary above shows investors the latest; this series shows the trend."
              addLabel="Add a snapshot"
              blank={BLANK_TRACTION}
              max={120}
              fields={[
                ['date', 'Date', 'date'],
                ['users', 'Users / customers'],
                ['revenue', 'Revenue'],
                ['growth', 'Growth'],
                ['note', 'What happened', 'area', true],
              ]}
            />
          </div>

          <SaveRow form={form}>Save traction</SaveRow>
        </form>
      </QueryState>
    </ProductPage>
  )
}

export { TractionPage }

// ---- the strategy workspace (spec §38–43) -------------------------------------------------

/** A pre-builder free-text field: rendered only when it holds something, so no old writing disappears. */
function LegacyNote({ form, path, label: text }) {
  if (!getPath(form.values, path)) return null
  return <Area form={form} path={path} label={text} rows={4} hint="Written before the section editors existed — still counted in your readiness score." />
}

/** One field inside a repeatable row, bound by array index. */
function RowField({ form, path, index, name, label: text, type }) {
  const full = `${path}.${index}.${name}`
  const raw = getPath(form.values, full)
  const error = form.errors[full]
  const onChange = (e) => {
    const value = e.target.value
    form.setValues((cur) => {
      const rows = getPath(cur, path) ?? []
      return setPath(cur, path, rows.map((row, n) => (n === index ? { ...row, [name]: value } : row)))
    })
  }
  const value = raw == null ? '' : type === 'date' ? String(raw).slice(0, 10) : raw
  return (
    <FormField label={text} htmlFor={full} error={error}>
      {type === 'area' ? (
        <Textarea id={full} rows={3} value={value} error={error} onChange={onChange} />
      ) : (
        <Input id={full} type={type === 'date' ? 'date' : 'text'} value={value} error={error} onChange={onChange} />
      )}
    </FormField>
  )
}

/** Add/remove rows for the list-valued sections (competitors, traction history). */
function Repeater({ form, path, title, hint, fields, blank, addLabel, max }) {
  const rows = getPath(form.values, path) ?? []
  const setRows = (next) => form.setValues((cur) => setPath(cur, path, next))
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium text-bone">{title}</h2>
          {hint && <p className="mt-1 text-sm text-mute/70">{hint}</p>}
        </div>
        <span className="font-mono text-xs text-mute">
          {rows.length}/{max}
        </span>
      </div>
      {rows.map((_, i) => (
        <div key={i} className="space-y-4 rounded-2xl border border-line/12 p-4 md:p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-mute">#{i + 1}</span>
            <button type="button" onClick={() => setRows(rows.filter((_, n) => n !== i))} className="text-xs text-mute transition-colors hover:text-flare">
              Remove
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {fields.map(([name, text, type, wide]) => (
              <div key={name} className={wide ? 'md:col-span-2' : ''}>
                <RowField form={form} path={path} index={i} name={name} label={text} type={type} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" magnetic={false} disabled={rows.length >= max} onClick={() => setRows([...rows, blank()])}>
        {addLabel}
      </Button>
    </div>
  )
}

/** Shared shell for the six workspace section editors. */
function SectionPage({ title, subtitle, q, form, submit, children }) {
  return (
    <ProductPage eco="FOUNDER" title={title} subtitle={subtitle}>
      <QueryState query={q}>
        <form onSubmit={submit} className="card-surface max-w-3xl space-y-5 p-6 md:p-8" noValidate>
          {children}
          <SaveRow form={form} />
        </form>
      </QueryState>
    </ProductPage>
  )
}

const SECTIONS = [
  ['Market', '/founders/workspace/market', 'Size it, segment it, name the problem you solve.'],
  ['Competitors', '/founders/workspace/competitors', 'Who else is solving it, and where you differ.'],
  ['SWOT', '/founders/workspace/swot', 'Strengths, weaknesses, opportunities and threats.'],
  ['Business model', '/founders/workspace/business-model', 'The nine canvas blocks, in plain language.'],
  ['Go-to-market', '/founders/workspace/gtm', 'Channels, pricing, launch plan and the numbers you watch.'],
  ['Pitch deck', '/founders/workspace/pitch-deck', 'The eleven sections investors expect to see.'],
]

export function WorkspacePage() {
  useHashScroll()
  const [params] = useSearchParams()
  const { q, form, submit } = useEditor((p) => ({ workspace: { problem: p.workspace.problem, targetCustomer: p.workspace.targetCustomer } }))
  return (
    <ProductPage eco="FOUNDER" title="Startup workspace" subtitle="Think it through, section by section. Each one feeds your readiness assessment.">
      {params.get('welcome') && (
        <div className="mb-6">
          <Notice tone="success">Your startup is set up. Start with the problem — it’s the foundation every other section builds on.</Notice>
        </div>
      )}
      <QueryState query={q}>
        <div className="space-y-6">
          <form onSubmit={submit} className="card-surface max-w-3xl space-y-5 p-6 md:p-8" noValidate>
            <div id="problem" className="scroll-mt-32 space-y-5">
              <Area form={form} path="workspace.problem" label="Problem statement" rows={5} hint="The specific pain, for a specific person." />
              <Area form={form} path="workspace.targetCustomer" label="Target customer" rows={3} />
            </div>
            <SaveRow form={form} />
          </form>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SECTIONS.map(([title, to, hint]) => (
              <li key={to}>
                <Link to={to} className="flex h-full flex-col rounded-2xl border border-line/12 p-5 transition-colors hover:border-violet/50">
                  <span className="flex items-center justify-between gap-3 text-bone">
                    {title}
                    <span aria-hidden>→</span>
                  </span>
                  <span className="mt-2 text-sm text-mute">{hint}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </QueryState>
    </ProductPage>
  )
}

export function MarketPage() {
  const { q, form, submit } = useEditor((p) => ({ workspace: { market: p.workspace.market, marketAnalysis: p.workspace.marketAnalysis } }))
  return (
    <SectionPage title="Market" subtitle="Who you serve, how big it is, and what is changing right now." q={q} form={form} submit={submit}>
      <Area form={form} path="workspace.market.market" label="The market" rows={5} hint="What is changing, and why now." />
      <Area form={form} path="workspace.market.customerSegment" label="Customer segment" rows={3} hint="Be specific enough that you could find them." />
      <div className="grid gap-5 md:grid-cols-3">
        <Text form={form} path="workspace.market.tam" label="TAM" hint="Everyone" />
        <Text form={form} path="workspace.market.sam" label="SAM" hint="Reachable" />
        <Text form={form} path="workspace.market.som" label="SOM" hint="Obtainable" />
      </div>
      <Area form={form} path="workspace.market.trends" label="Trends" rows={4} />
      <Area form={form} path="workspace.market.customerProblem" label="Customer problem" rows={4} />
      <Area form={form} path="workspace.market.opportunity" label="Opportunity" rows={4} />
      <LegacyNote form={form} path="workspace.marketAnalysis" label="Market analysis (earlier notes)" />
    </SectionPage>
  )
}

const BLANK_COMPETITOR = () => ({ name: '', description: '', strengths: '', weaknesses: '', pricing: '', positioning: '', differentiation: '' })

export function CompetitorsPage() {
  const q = useFounderProfile()
  const save = useSaveFounder()
  const form = useForm(q.data ? { workspace: { competitorAnalysis: q.data.workspace.competitorAnalysis, competitors: q.data.workspace.competitors } } : {})
  const submit = (e) => {
    e.preventDefault()
    form.run((v) =>
      save({
        workspace: {
          competitorAnalysis: (v.workspace.competitorAnalysis ?? [])
            .filter((c) => Object.values(c).some((x) => String(x ?? '').trim()))
            .map((c) => Object.fromEntries(Object.entries(c).map(([k, x]) => [k, nil(x)]))),
          competitors: nil(v.workspace.competitors),
        },
      }),
    )
  }
  return (
    <ProductPage eco="FOUNDER" title="Competitors" subtitle="Who else is solving this, what they do well, and where you win.">
      <QueryState query={q}>
        <form onSubmit={submit} className="space-y-6" noValidate>
          <div className="card-surface p-6 md:p-8">
            <LegacyNote form={form} path="workspace.competitors" label="Competitor notes (earlier)" />
            <Repeater
              form={form}
              path="workspace.competitorAnalysis"
              title="Competitor list"
              hint="One row per company. Saving replaces the whole list, so remove rows you no longer want."
              addLabel="Add a competitor"
              blank={BLANK_COMPETITOR}
              max={30}
              fields={[
                ['name', 'Name'],
                ['pricing', 'Pricing'],
                ['description', 'What they do', 'area', true],
                ['strengths', 'Their strengths', 'area', true],
                ['weaknesses', 'Their weaknesses', 'area', true],
                ['positioning', 'How they position', 'area', true],
                ['differentiation', 'How you differ', 'area', true],
              ]}
            />
          </div>
          <SaveRow form={form}>Save competitors</SaveRow>
        </form>
      </QueryState>
    </ProductPage>
  )
}

export function SwotPage() {
  const { q, form, submit } = useEditor((p) => ({ workspace: { swot: p.workspace.swot } }))
  return (
    <SectionPage title="SWOT" subtitle="An honest read on where you stand. Investors can tell when this is padded." q={q} form={form} submit={submit}>
      <div className="grid gap-5 md:grid-cols-2">
        <Area form={form} path="workspace.swot.strengths" label="Strengths" rows={4} />
        <Area form={form} path="workspace.swot.weaknesses" label="Weaknesses" rows={4} />
        <Area form={form} path="workspace.swot.opportunities" label="Opportunities" rows={4} />
        <Area form={form} path="workspace.swot.threats" label="Threats" rows={4} />
      </div>
    </SectionPage>
  )
}

export function BusinessModelPage() {
  const { q, form, submit } = useEditor((p) => ({ workspace: { businessModelCanvas: p.workspace.businessModelCanvas, businessModel: p.workspace.businessModel } }))
  return (
    <SectionPage title="Business model" subtitle="The nine blocks of the canvas, in your own words." q={q} form={form} submit={submit}>
      <Area form={form} path="workspace.businessModelCanvas.customerSegments" label="Customer segments" rows={3} />
      <Area form={form} path="workspace.businessModelCanvas.valueProposition" label="Value proposition" rows={3} />
      <Area form={form} path="workspace.businessModelCanvas.channels" label="Channels" rows={3} />
      <Area form={form} path="workspace.businessModelCanvas.customerRelationships" label="Customer relationships" rows={3} />
      <Area form={form} path="workspace.businessModelCanvas.revenueStreams" label="Revenue streams" rows={3} hint="Who pays, how much, and how often." />
      <Area form={form} path="workspace.businessModelCanvas.keyResources" label="Key resources" rows={3} />
      <Area form={form} path="workspace.businessModelCanvas.keyActivities" label="Key activities" rows={3} />
      <Area form={form} path="workspace.businessModelCanvas.keyPartnerships" label="Key partnerships" rows={3} />
      <Area form={form} path="workspace.businessModelCanvas.costStructure" label="Cost structure" rows={3} />
      <LegacyNote form={form} path="workspace.businessModel" label="Business model (earlier notes)" />
    </SectionPage>
  )
}

export function GtmPage() {
  const { q, form, submit } = useEditor((p) => ({ workspace: { gtm: p.workspace.gtm, gtmStrategy: p.workspace.gtmStrategy, marketingStrategy: p.workspace.marketingStrategy } }))
  return (
    <SectionPage title="Go-to-market" subtitle="How you reach the first thousand customers, and what you watch while you do it." q={q} form={form} submit={submit}>
      <Area form={form} path="workspace.gtm.targetCustomers" label="Target customers" rows={3} />
      <Area form={form} path="workspace.gtm.positioning" label="Positioning" rows={3} />
      <Area form={form} path="workspace.gtm.acquisitionChannels" label="Acquisition channels" rows={4} />
      <Area form={form} path="workspace.gtm.salesStrategy" label="Sales strategy" rows={4} />
      <Area form={form} path="workspace.gtm.pricing" label="Pricing" rows={3} />
      <Area form={form} path="workspace.gtm.launchPlan" label="Launch plan" rows={4} />
      <Area form={form} path="workspace.gtm.growthStrategy" label="Growth strategy" rows={4} />
      <Area form={form} path="workspace.gtm.kpis" label="KPIs" rows={3} hint="The numbers you check every week." />
      <LegacyNote form={form} path="workspace.gtmStrategy" label="GTM strategy (earlier notes)" />
      <LegacyNote form={form} path="workspace.marketingStrategy" label="Marketing strategy (earlier notes)" />
    </SectionPage>
  )
}

export function PitchDeckPage() {
  const { q, form, submit } = useEditor((p) => ({
    workspace: { pitchDeck: p.workspace.pitchDeck, pitchDeckUrl: p.workspace.pitchDeckUrl, fundingNeeds: p.workspace.fundingNeeds, pitchNotes: p.workspace.pitchNotes },
  }))
  return (
    <SectionPage title="Pitch deck" subtitle="Write the story here, then keep the deck itself in sync. Both count towards readiness." q={q} form={form} submit={submit}>
      <Text form={form} path="workspace.pitchDeckUrl" label="Pitch deck link" type="url" hint="Google Slides, Docsend, Pitch.com or a PDF link." />
      <Area form={form} path="workspace.pitchDeck.problem" label="Problem" rows={3} />
      <Area form={form} path="workspace.pitchDeck.solution" label="Solution" rows={3} />
      <Area form={form} path="workspace.pitchDeck.product" label="Product" rows={3} />
      <Area form={form} path="workspace.pitchDeck.market" label="Market" rows={3} />
      <Area form={form} path="workspace.pitchDeck.businessModel" label="Business model" rows={3} />
      <Area form={form} path="workspace.pitchDeck.traction" label="Traction" rows={3} />
      <Area form={form} path="workspace.pitchDeck.competition" label="Competition" rows={3} />
      <Area form={form} path="workspace.pitchDeck.goToMarket" label="Go-to-market" rows={3} />
      <Area form={form} path="workspace.pitchDeck.team" label="Team" rows={3} />
      <Area form={form} path="workspace.pitchDeck.financials" label="Financials" rows={3} />
      <Area form={form} path="workspace.pitchDeck.fundingAsk" label="Funding ask" rows={3} />
      <Area form={form} path="workspace.fundingNeeds" label="Funding needs" rows={3} />
      <LegacyNote form={form} path="workspace.pitchNotes" label="Pitch narrative (earlier notes)" />
    </SectionPage>
  )
}
