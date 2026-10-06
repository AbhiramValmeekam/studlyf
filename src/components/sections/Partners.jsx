import { Marquee } from '../ui/Marquee'
import { Avatar } from '../ui/atoms'

function PartnerMark({ partner }) {
  return (
    <div className="flex items-center gap-3 opacity-60 transition-opacity duration-300 hover:opacity-100">
      {partner.logo?.url ? (
        <img src={partner.logo.url} alt={partner.name} className="h-9 w-auto object-contain" loading="lazy" />
      ) : (
        <Avatar name={partner.name} size={36} />
      )}
      <span className="whitespace-nowrap text-lg font-medium tracking-tight text-bone">{partner.name}</span>
    </div>
  )
}

export function Partners({ items = [] }) {
  if (!items.length) return null
  const half = Math.ceil(items.length / 2)
  const rowA = items.slice(0, half)
  const rowB = items.slice(half).length ? items.slice(half) : rowA

  return (
    <section className="relative border-t border-line/10 py-20">
      <div className="wrap mb-10">
        <p className="eyebrow">Trusted by teams building the future</p>
      </div>
      <div className="space-y-8">
        <Marquee speed={45}>
          {rowA.map((p) => (
            <PartnerMark key={p.id} partner={p} />
          ))}
        </Marquee>
        <Marquee speed={55} reverse>
          {rowB.map((p) => (
            <PartnerMark key={`b-${p.id}`} partner={p} />
          ))}
        </Marquee>
      </div>
    </section>
  )
}
