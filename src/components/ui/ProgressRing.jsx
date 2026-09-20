/**
 * ProgressRing — SVG donut used for profile completion, startup readiness and
 * evaluation scores. Value is 0–100.
 */
export function ProgressRing({ value = 0, size = 88, stroke = 8, color = 'var(--acid)', label }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c - (Math.min(100, Math.max(0, value)) / 100) * c
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--bone) / 0.14)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute text-center">
        <span className="font-display text-xl text-bone leading-none">{Math.round(value)}</span>
        {label && <span className="block text-[9px] tracking-widest text-bone2 mt-0.5">{label}</span>}
      </div>
    </div>
  )
}

export function ProgressBar({ value = 0, color = 'var(--acid)', className = '' }) {
  return (
    <div className={`h-1.5 w-full rounded-full bg-bone/12 overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color, transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)' }}
      />
    </div>
  )
}
