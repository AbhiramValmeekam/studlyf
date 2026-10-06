import { forwardRef } from 'react'

const fieldBase =
  'w-full rounded-xl border border-line/12 bg-ink2/60 px-4 py-3 text-bone placeholder:text-mute/60 outline-none transition-colors duration-200 focus:border-acid/60 focus:bg-ink2'

export function Label({ children, htmlFor, className = '' }) {
  return (
    <label htmlFor={htmlFor} className={`mb-2 block text-sm font-medium text-bone/90 ${className}`}>
      {children}
    </label>
  )
}

export function FieldError({ children }) {
  if (!children) return null
  return <p className="mt-1.5 text-sm text-flare">{children}</p>
}

export const Input = forwardRef(function Input({ error, className = '', ...props }, ref) {
  return (
    <input
      ref={ref}
      className={`${fieldBase} ${error ? 'border-flare/60' : ''} ${className}`}
      aria-invalid={!!error}
      {...props}
    />
  )
})

export const Textarea = forwardRef(function Textarea({ error, className = '', ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={`${fieldBase} min-h-28 resize-y ${error ? 'border-flare/60' : ''} ${className}`}
      aria-invalid={!!error}
      {...props}
    />
  )
})

export function Select({ error, className = '', children, ...props }) {
  return (
    <div className="relative">
      <select
        className={`${fieldBase} appearance-none pr-10 ${error ? 'border-flare/60' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-mute"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
      >
        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

// A full labelled field with error slot.
export function FormField({ label, htmlFor, error, children, hint }) {
  return (
    <div>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {hint && !error && <p className="mt-1.5 text-sm text-mute/70">{hint}</p>}
      <FieldError>{error}</FieldError>
    </div>
  )
}
