import { PreviewFrame } from './Landing'

// Product previews for each ecosystem — the polished UI mockups shown in the homepage spotlights.
// Illustrative sample data only (fictional people and startups). Each surface is layered
// (gradient plate + inner cards + accent detail) so it reads like a real product screenshot.

/** Small inline check glyph — no icon dependency. Inherits colour via currentColor. */
function Check({ className = '' }) {
  return (
    <svg viewBox="0 0 12 12" className={`h-3 w-3 ${className}`} fill="none" aria-hidden>
      <path d="M2.5 6.2l2.2 2.2 4.8-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ProofOfWorkPreview() {
  const rows = [
    ['SignBridge — ISL captions', 'Hackathon · Shortlisted', '84.5'],
    ['KrishiLink — mandi price SMS', 'Winner · Spring Build Sprint', '91.0'],
    ['DocDraft — docs engine', 'Open source · Published', '—'],
  ]
  return (
    <PreviewFrame label="studlyf.in/builders/aanya" accent="bg-acid">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-acid/30 to-acid/5 font-mono text-sm font-semibold text-acid ring-1 ring-acid/30">AI</span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-semibold text-bone">
            Aanya Iyer
            <span className="grid h-4 w-4 place-items-center rounded-full bg-acid/20 text-acid"><Check /></span>
          </p>
          <p className="truncate text-xs text-mute">ML engineer · accessibility tools · Chennai</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        {[['7', 'Projects'], ['4', 'Achievements'], ['3', 'Evaluations']].map(([n, l]) => (
          <div key={l} className="rounded-xl border border-line/10 bg-gradient-to-b from-white/[0.05] to-transparent py-3">
            <p className="display-face text-2xl text-bone">{n}</p>
            <p className="text-[11px] text-mute">{l}</p>
          </div>
        ))}
      </div>
      <ul className="mt-5 space-y-2">
        {rows.map(([t, s, score]) => (
          <li key={t} className="flex items-center justify-between rounded-xl border border-line/10 bg-white/[0.02] px-3 py-2.5">
            <span className="min-w-0">
              <span className="block truncate text-sm text-bone">{t}</span>
              <span className="block text-[11px] text-mute">{s}</span>
            </span>
            <span className={`ml-3 shrink-0 rounded-md px-2 py-1 font-mono text-xs ${score === '—' ? 'bg-line/[0.06] text-mute' : 'bg-acid/15 text-acid'}`}>{score}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {['Python', 'React', 'TensorFlow.js', 'Figma'].map((s) => (
          <span key={s} className="rounded-full border border-acid/20 bg-acid/10 px-2.5 py-1 text-[11px] text-acid">{s}</span>
        ))}
      </div>
    </PreviewFrame>
  )
}

export function ReadinessPreview() {
  const items = [
    ['Startup basics', true],
    ['Problem statement', true],
    ['Market analysis', true],
    ['Competitor analysis', false],
    ['Business model', true],
    ['Go-to-market strategy', false],
    ['Traction', true],
  ]
  return (
    <PreviewFrame label="Founder workspace · SoilSense" accent="bg-violet">
      <div className="flex items-end justify-between">
        <div>
          <p className="eyebrow">Startup readiness</p>
          <p className="display-face mt-2 text-6xl leading-none text-bone">
            70<span className="text-2xl text-mute">/100</span>
          </p>
        </div>
        <span className="rounded-full border border-violet/30 bg-violet/15 px-3 py-1 text-xs text-violet">Taking shape</span>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-line/10">
        <div className="h-full w-[70%] rounded-full bg-gradient-to-r from-violet/60 to-violet" />
      </div>
      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {items.map(([label, done]) => (
          <li key={label} className="flex items-center gap-2 rounded-lg border border-line/10 bg-white/[0.02] px-2.5 py-2 text-sm">
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${done ? 'bg-violet text-white' : 'border border-line/25 text-mute'}`}>{done && <Check />}</span>
            <span className={`truncate ${done ? 'text-bone' : 'text-mute'}`}>{label}</span>
          </li>
        ))}
      </ul>
    </PreviewFrame>
  )
}

export function DiscoveryPreview() {
  const rows = [
    ['SoilSense', 'AgriTech · Pune', 'Early traction', 'Pre-seed', 70],
    ['StudySync', 'EdTech · Bengaluru', 'MVP', 'Bootstrapped', 35],
    ['GreenBox', 'Climate · Chennai', 'Idea', 'Pre-seed', 25],
  ]
  return (
    <PreviewFrame label="Investor discovery · verified access" accent="bg-flare">
      <div className="flex flex-wrap gap-1.5">
        {['Stage: Early traction', 'Industry: AgriTech', 'Geography: India', 'Pre-seed'].map((f) => (
          <span key={f} className="rounded-full border border-flare/30 bg-flare/10 px-2.5 py-1 text-[11px] text-flare">{f}</span>
        ))}
      </div>
      <ul className="mt-5 space-y-2">
        {rows.map(([name, meta, stage, funding, score]) => (
          <li key={name} className="rounded-xl border border-line/10 bg-white/[0.02] px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block font-semibold text-bone">{name}</span>
                <span className="block truncate text-[11px] text-mute">
                  {meta} · {stage} · {funding}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-mono text-sm text-flare">{score}</span>
                <span className="block text-[10px] text-mute">readiness</span>
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line/10">
              <div className="h-full rounded-full bg-gradient-to-r from-flare/50 to-flare" style={{ width: `${score}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </PreviewFrame>
  )
}

export function CandidatePreview() {
  return (
    <PreviewFrame label="Talent · candidate evidence" accent="bg-lime-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-lime-300/25 to-lime-300/5 font-mono text-sm font-semibold text-lime-300 ring-1 ring-lime-300/30">RV</span>
          <div>
            <p className="font-semibold text-bone">Rohan Verma</p>
            <p className="text-xs text-mute">Backend builder · Pune · available</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-lime-300/30 bg-lime-300/15 px-2.5 py-1 text-[11px] text-lime-300">Shortlisted</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {['Go', 'Node.js', 'Cloud', 'PostgreSQL'].map((s) => (
          <span key={s} className="rounded-full border border-line/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-bone/80">{s}</span>
        ))}
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-2">
        {[
          ['Projects', '3 public'],
          ['Best evaluation', '91.0 / 100'],
          ['Achievements', 'Winner · 2 verified'],
          ['GitHub', 'github.com/rohan-v'],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-line/10 bg-gradient-to-b from-white/[0.05] to-transparent px-3 py-2.5">
            <dt className="text-[11px] text-mute">{k}</dt>
            <dd className="truncate text-sm text-bone">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex items-center gap-1.5 text-[11px]">
        {['Shortlist', 'Interview', 'Offer', 'Hired'].map((s, i) => (
          <span key={s} className={`flex-1 rounded-full py-1.5 text-center ${i === 0 ? 'bg-lime-300 font-medium text-ink' : 'bg-white/[0.04] text-mute'}`}>{s}</span>
        ))}
      </div>
    </PreviewFrame>
  )
}

export function ProgramPreview() {
  const stages = [
    ['Registrations', '1,240'],
    ['Teams', '318'],
    ['Submissions', '204'],
    ['Evaluated', '196'],
    ['Ranked', 'Top 20'],
    ['Certificates', '612'],
  ]
  return (
    <PreviewFrame label="Program · Campus Robotics Hackathon" accent="bg-amber-300">
      <ol className="space-y-2">
        {stages.map(([label, n], i) => (
          <li key={label} className="flex items-center gap-3">
            <span className="w-6 font-mono text-[11px] text-mute">{String(i + 1).padStart(2, '0')}</span>
            <span className="relative h-9 flex-1 overflow-hidden rounded-lg border border-line/10 bg-white/[0.02]">
              <span className="absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r from-amber-300/30 to-amber-300/10" style={{ width: `${100 - i * 13}%` }} />
              <span className="relative flex h-full items-center justify-between px-3 text-sm">
                <span className="text-bone">{label}</span>
                <span className="font-mono text-xs text-amber-300">{n}</span>
              </span>
            </span>
          </li>
        ))}
      </ol>
    </PreviewFrame>
  )
}

// Framed photographic hero visual for the ecosystem landing pages — a rounded, bordered plate
// with a soft persona-accent glow behind it. It sits inside the hero's TiltVisual, so it inherits
// the pointer-driven tilt + idle float. `accent` is a bg-* class (JIT-safe, from lib/ecosystems).
export function ImageVisual({ src, alt, accent = 'bg-acid' }) {
  return (
    <div className="relative">
      <div aria-hidden className={`absolute -inset-4 -z-10 rounded-[2.5rem] ${accent} opacity-20 blur-[80px]`} />
      <div className="overflow-hidden rounded-[1.75rem] border border-line/12 bg-ink2/70 p-2 shadow-2xl">
        <img
          src={src}
          alt={alt}
          loading="eager"
          className="aspect-[4/3] w-full rounded-[1.25rem] object-cover"
        />
      </div>
    </div>
  )
}
