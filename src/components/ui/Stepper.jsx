/**
 * Stepper — horizontal step indicator for the application / hiring wizards.
 * `steps` is a string[]; `current` is the active index.
 */
export function Stepper({ steps = [], current = 0 }) {
  return (
    <ol className="flex items-center w-full">
      {steps.map((s, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2.5">
              <span
                className={`grid place-items-center h-8 w-8 rounded-full text-xs font-display shrink-0 transition-colors ${
                  active ? 'bg-acid text-ink' : done ? 'bg-acid/25 text-acid' : 'bg-bone/10 text-bone2'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className={`text-xs font-medium hidden sm:block ${active ? 'text-bone' : 'text-bone2'}`}>{s}</span>
            </div>
            {i < steps.length - 1 && (
              <span className={`flex-1 h-px mx-3 ${done ? 'bg-acid/40' : 'bg-bone/15'}`} />
            )}
          </li>
        )
      })}
    </ol>
  )
}
