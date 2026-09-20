import { Chip } from './primitives'

/**
 * FilterBar — a search input plus one or more facet groups of toggle chips.
 * Reused by Builder Opportunities, HR Talent, and Investor Founder discovery.
 *
 * props:
 *   query, onQuery            — search string + setter
 *   groups: [{ key, label, options: string[], multi?: bool }]
 *   selected: { [key]: string[] }
 *   onToggle(key, option)
 *   onClear()
 */
export function FilterBar({ query = '', onQuery, groups = [], selected = {}, onToggle, onClear, placeholder = 'Search…' }) {
  const activeCount = Object.values(selected).reduce((n, arr) => n + (arr?.length || 0), 0)
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-bone2">⌕</span>
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={placeholder}
            data-cursor="text"
            className="w-full rounded-full bg-ink2/70 border border-bone/15 pl-11 pr-4 py-3 text-sm text-bone placeholder:text-bone2/50 outline-none focus:border-acid transition-colors"
          />
        </div>
        {activeCount > 0 && (
          <button
            onClick={onClear}
            data-cursor="hover"
            className="text-xs text-bone2 hover:text-flare transition-colors whitespace-nowrap"
          >
            Clear ({activeCount})
          </button>
        )}
      </div>

      {groups.map((g) => (
        <div key={g.key}>
          <p className="text-[11px] uppercase tracking-widest text-bone2/70 mb-2">{g.label}</p>
          <div className="flex flex-wrap gap-2">
            {g.options.map((opt) => (
              <Chip key={opt} active={selected[g.key]?.includes(opt)} onClick={() => onToggle(g.key, opt)}>
                {opt}
              </Chip>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
