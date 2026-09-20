import { startups } from '../../data/mock/startups'
import { Card, PageTitle } from '../../components/ui/primitives'
import { BarChart, DonutChart, DistributionBar } from '../../components/ui/charts'

/**
 * Investor Analytics — aggregated views over the discoverable founder pool:
 * stage overview, industry distribution, revenue bands, geography, funding.
 */
function countBy(arr, key) {
  const m = {}
  arr.forEach((x) => { const k = typeof key === 'function' ? key(x) : x[key]; m[k] = (m[k] || 0) + 1 })
  return Object.entries(m).map(([label, value]) => ({ label, value }))
}

export default function InvestorAnalytics() {
  const byStage = countBy(startups, 'stage')
  const byIndustry = countBy(startups, 'industry')
  const byRevenue = countBy(startups, 'revenueBand')
  const byGeo = countBy(startups, 'location')
  const byFunding = countBy(startups, 'fundingStage')

  return (
    <>
      <PageTitle eyebrow="Analytics" title="Portfolio intelligence" />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="font-display text-xl text-bone tracking-crush mb-5">Founders by stage</h2>
          <BarChart data={byStage} />
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-xl text-bone tracking-crush mb-5">Industry distribution</h2>
          <DonutChart data={byIndustry} />
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-xl text-bone tracking-crush mb-5">Revenue bands</h2>
          <DistributionBar data={byRevenue} />
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-xl text-bone tracking-crush mb-5">Funding stage</h2>
          <DonutChart data={byFunding} />
        </Card>
        <Card className="p-6 lg:col-span-2">
          <h2 className="font-display text-xl text-bone tracking-crush mb-5">Geographic distribution</h2>
          <DistributionBar data={byGeo} />
        </Card>
      </div>
    </>
  )
}
