/**
 * Hand-rolled SVG charts — no chart library, so the visual language stays
 * bespoke and on-brand. All take `data: [{ label, value }]`.
 */
// Index 3 uses the themeable `--bone` token (off-white in dark, near-black in
// light) so no segment goes invisible when the theme flips. The rest are
// vivid accents that read on either background.
const PALETTE = ['#C7F24E', '#6C4BFF', '#FF4A28', 'rgb(var(--bone))', '#8fb3ff', '#f5a623']

export function BarChart({ data = [], color = 'var(--acid)', height = 180 }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="flex items-end gap-3" style={{ height }}>
      {data.map((d, i) => (
        <div key={d.label} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
          <span className="text-xs text-bone font-display">{d.value}</span>
          <div
            className="w-full rounded-t-md"
            style={{
              height: `${(d.value / max) * 100}%`,
              background: color,
              minHeight: 4,
              transition: 'height 0.7s cubic-bezier(0.16,1,0.3,1)',
            }}
          />
          <span className="text-[10px] text-bone2 text-center tracking-wide truncate w-full">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

export function DonutChart({ data = [], size = 170, stroke = 26 }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  let acc = 0
  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} className="-rotate-90 shrink-0">
        {data.map((d, i) => {
          const frac = d.value / total
          const dash = frac * c
          const seg = (
            <circle
              key={d.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-acc * c}
            />
          )
          acc += frac
          return seg
        })}
      </svg>
      <ul className="space-y-2">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2 text-sm text-bone2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="text-bone">{d.label}</span>
            <span className="text-bone2">· {Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function DistributionBar({ data = [] }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-xs text-bone2 text-right">{d.label}</span>
          <div className="flex-1 h-6 rounded-md bg-bone/8 overflow-hidden">
            <div
              className="h-full rounded-md flex items-center justify-end pr-2"
              style={{ width: `${(d.value / max) * 100}%`, background: PALETTE[i % PALETTE.length], minWidth: 24, transition: 'width 0.7s cubic-bezier(0.16,1,0.3,1)' }}
            >
              <span className="text-[10px] font-display text-ink">{d.value}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
