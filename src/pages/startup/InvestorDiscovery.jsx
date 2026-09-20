import { Card, Tag, Button, PageTitle } from '../../components/ui/primitives'

/**
 * Founder-side Investor Discovery — the mirror of the investor portal: a
 * founder browses investors whose thesis matches their startup.
 */
const IMG = '/scraped'
const investors = [
  { id: 'northstar', name: 'Northstar Capital', logo: `${IMG}/s39_goldman-sachs.webp`, thesis: 'Seed–Series A B2B SaaS in India', check: '₹4–12Cr', stages: ['Seed', 'Series A'], match: 92 },
  { id: 'peak-xv', name: 'Peak Ventures', logo: `${IMG}/s38_jpmorgan.webp`, thesis: 'AI-first applications & infra', check: '₹8–25Cr', stages: ['Seed', 'Series A'], match: 86 },
  { id: 'lightwedge', name: 'Lightwedge', logo: `${IMG}/s33_stripe.webp`, thesis: 'Pre-seed founder-first bets', check: '₹1–4Cr', stages: ['Pre-seed', 'Seed'], match: 78 },
  { id: 'meridian', name: 'Meridian Fund', logo: `${IMG}/s35_paypal.webp`, thesis: 'Vertical SaaS & fintech', check: '₹6–20Cr', stages: ['Seed', 'Series A'], match: 71 },
]

export default function FounderInvestors() {
  return (
    <>
      <PageTitle eyebrow="Investor Discovery" title="Investors for Loopwise" />
      <p className="text-bone2 mb-6 max-w-xl">Ranked by fit with your stage, sector and traction. Improve your readiness score to unlock warmer intros.</p>

      <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
        {investors.map((v) => (
          <Card key={v.id} hover className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img src={v.logo} alt={v.name} className="h-11 w-11 rounded-lg bg-white object-contain p-1.5" />
                <div>
                  <h3 className="font-display text-xl text-bone tracking-crush">{v.name}</h3>
                  <p className="text-xs text-bone2">{v.check} · {v.stages.join(' / ')}</p>
                </div>
              </div>
              <div className="text-center">
                <span className="font-display text-2xl text-violet leading-none">{v.match}</span>
                <span className="block text-[10px] tracking-widest text-bone2">MATCH</span>
              </div>
            </div>
            <p className="text-sm text-bone2 mt-4">{v.thesis}</p>
            <div className="flex gap-3 mt-5">
              <Button variant="violet" size="sm" onClick={() => alert('Prototype: intro requested.')}>Request intro</Button>
              <Button variant="ghost" size="sm" onClick={() => alert('Prototype: thesis details.')}>View thesis</Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
