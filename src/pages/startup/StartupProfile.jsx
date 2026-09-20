import { myStartup, INDUSTRIES, STAGES } from '../../data/mock/startups'
import { Card, PageTitle, Button, Tag } from '../../components/ui/primitives'
import { Field, Input, TextArea, Select } from '../../components/ui/forms'

/**
 * Startup Profile — the full structured venture profile investors discover:
 * problem/solution, industry, stage, model, team, product, traction, funding.
 */
export default function StartupProfile() {
  const s = myStartup
  return (
    <>
      <PageTitle eyebrow="Startup Profile" title="Your venture">
        <Button size="sm" onClick={() => alert('Prototype: saved.')}>Save changes</Button>
      </PageTitle>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 space-y-5">
            <h3 className="font-display text-xl text-bone tracking-crush">Basics</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Startup name"><Input defaultValue={s.name} /></Field>
              <Field label="Website"><Input defaultValue={s.website} /></Field>
              <Field label="Industry">
                <Select defaultValue={s.industry}>{INDUSTRIES.map((i) => <option key={i}>{i}</option>)}</Select>
              </Field>
              <Field label="Stage">
                <Select defaultValue={s.stage}>{STAGES.map((i) => <option key={i}>{i}</option>)}</Select>
              </Field>
            </div>
            <Field label="One-liner"><Input defaultValue={s.tagline} /></Field>
          </Card>

          <Card className="p-6 space-y-5">
            <h3 className="font-display text-xl text-bone tracking-crush">Problem & solution</h3>
            <Field label="Problem"><TextArea defaultValue={s.problem} /></Field>
            <Field label="Solution"><TextArea defaultValue={s.solution} /></Field>
            <Field label="Business model"><Input defaultValue={s.businessModel} /></Field>
          </Card>

          <Card className="p-6 space-y-5">
            <h3 className="font-display text-xl text-bone tracking-crush">Traction & funding</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Traction"><Input defaultValue={s.traction} /></Field>
              <Field label="Product"><Input defaultValue={s.product} /></Field>
              <Field label="Funding"><Input defaultValue={s.funding} /></Field>
              <Field label="Team size"><Input type="number" defaultValue={s.teamSize} /></Field>
            </div>
          </Card>
        </div>

        {/* live investor-card preview */}
        <div>
          <Card className="p-6 lg:sticky lg:top-24">
            <p className="eyebrow text-bone2 mb-3">Investor sees</p>
            <div className="rounded-xl border border-bone/12 p-5 bg-ink/40">
              <div className="flex items-center gap-3">
                <img src={s.logo} alt={s.name} className="h-10 w-10 rounded-lg bg-white object-contain p-1" />
                <div>
                  <p className="text-bone font-medium">{s.name}</p>
                  <p className="text-[11px] text-bone2">{s.industry} · {s.stage}</p>
                </div>
              </div>
              <p className="text-sm text-bone2 mt-3">{s.tagline}</p>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {s.metrics.slice(0, 4).map((m) => (
                  <div key={m.label} className="rounded-lg bg-bone/5 p-2">
                    <p className="text-[10px] text-bone2">{m.label}</p>
                    <p className="text-sm text-bone font-display">{m.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4"><Tag tone="violet">Readiness {s.readiness}</Tag></div>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
