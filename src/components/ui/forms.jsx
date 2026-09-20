/**
 * Form primitives with inline validation display. Dark-surface styling matches
 * the app shell. `error` shows a flare-colored message beneath the field.
 */
export function Field({ label, error, hint, required, children }) {
  return (
    <label className="block">
      {label && (
        <span className="block text-xs font-medium text-bone2 mb-2">
          {label}
          {required && <span className="text-flare ml-1">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="block text-[11px] text-flare mt-1.5">{error}</span>
      ) : hint ? (
        <span className="block text-[11px] text-bone2/70 mt-1.5">{hint}</span>
      ) : null}
    </label>
  )
}

const base =
  'w-full rounded-xl bg-ink/60 border px-4 py-3 text-sm text-bone placeholder:text-bone2/50 outline-none transition-colors focus:border-acid'

export function Input({ error, className = '', ...rest }) {
  return <input className={`${base} ${error ? 'border-flare/60' : 'border-bone/15'} ${className}`} data-cursor="text" {...rest} />
}

export function TextArea({ error, className = '', rows = 4, ...rest }) {
  return <textarea rows={rows} className={`${base} resize-none ${error ? 'border-flare/60' : 'border-bone/15'} ${className}`} data-cursor="text" {...rest} />
}

export function Select({ error, className = '', children, ...rest }) {
  return (
    <select className={`${base} appearance-none ${error ? 'border-flare/60' : 'border-bone/15'} ${className}`} {...rest}>
      {children}
    </select>
  )
}

// Multi-select via clickable chips (used for skills etc.)
export function ChipSelect({ options = [], value = [], onChange }) {
  const toggle = (opt) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt))
    else onChange([...value, opt])
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            data-cursor="hover"
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors ${
              active ? 'bg-acid text-ink border-acid' : 'text-bone2 border-bone/20 hover:border-bone/50'
            }`}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}
