// Compact numbered pagination with prev/next.
export function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null

  const pages = pageWindow(page, totalPages)

  const btn =
    'grid h-10 min-w-10 place-items-center rounded-full px-3 text-sm transition-colors duration-200'

  return (
    <nav className="mt-14 flex items-center justify-center gap-2" aria-label="Pagination">
      <button
        className={`${btn} border border-line/15 text-mute hover:text-bone disabled:opacity-30 disabled:hover:text-mute`}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        ←
      </button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="px-1 text-mute">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            aria-current={p === page}
            className={`${btn} ${
              p === page ? 'bg-acid text-ink' : 'text-mute hover:bg-line/[0.06] hover:text-bone'
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        className={`${btn} border border-line/15 text-mute hover:text-bone disabled:opacity-30 disabled:hover:text-mute`}
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        →
      </button>
    </nav>
  )
}

function pageWindow(current, total) {
  const out = []
  const add = (n) => out.push(n)
  add(1)
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) out.push('…')
  for (let i = start; i <= end; i++) add(i)
  if (end < total - 1) out.push('…')
  if (total > 1) add(total)
  return out
}
