import { RESUME_TEMPLATES } from './registry'

// A compact template picker: a row of swatch chips. `value` is the active id,
// `onChange(id)` fires on select. Purely presentational — the editor owns the state.
export function TemplatePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {RESUME_TEMPLATES.map((t) => {
        const active = t.id === value
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            aria-pressed={active}
            className={`group rounded-xl border p-3 text-left transition ${
              active ? 'border-acid/60 bg-acid/[0.06]' : 'border-line/12 hover:border-line/25'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: t.swatch }} />
              <span className={`text-sm font-semibold ${active ? 'text-bone' : 'text-bone/85'}`}>{t.name}</span>
            </span>
            <span className="mt-1 block text-[11px] leading-snug text-mute/80">{t.sub}</span>
          </button>
        )
      })}
    </div>
  )
}
