import { myStartup } from '../../data/mock/startups'
import { Card, Tag, PageTitle, Avatar, Button } from '../../components/ui/primitives'
import { Field, Input, TextArea } from '../../components/ui/forms'

/**
 * Founder Profile — the person behind the startup: experience, prior ventures,
 * achievements, pitch. Presented as an editable structured form.
 */
export default function FounderProfile() {
  const f = myStartup.founder
  return (
    <>
      <PageTitle eyebrow="Founder Profile" title="About you">
        <Button size="sm" onClick={() => alert('Prototype: saved.')}>Save changes</Button>
      </PageTitle>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-1 h-fit">
          <div className="flex flex-col items-center text-center">
            <Avatar src={f.avatar} name={f.name} size={96} />
            <h2 className="font-display text-2xl text-bone tracking-crush mt-4">{f.name}</h2>
            <p className="text-bone2 text-sm">{f.role}</p>
            <Tag tone="violet" className="mt-3">Loopwise</Tag>
            <a href="#" className="text-sm text-violet mt-4" data-cursor="hover">↗ {f.linkedin}</a>
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 space-y-5">
            <h3 className="font-display text-xl text-bone tracking-crush">Background</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full name"><Input defaultValue={f.name} /></Field>
              <Field label="Role"><Input defaultValue={f.role} /></Field>
            </div>
            <Field label="Experience"><TextArea defaultValue="8 years in enterprise SaaS. Led sales engineering at a unicorn before founding Loopwise." /></Field>
            <Field label="Previous ventures"><TextArea defaultValue="Co-built a field-ops CRM (acquired, 2021). Angel in 6 early-stage startups." /></Field>
          </Card>

          <Card className="p-6 space-y-5">
            <h3 className="font-display text-xl text-bone tracking-crush">Achievements</h3>
            <Field label="Highlights"><TextArea defaultValue="Forbes 30U30 · Y-Combinator alum · Speaker at SaaSBOOMi" /></Field>
          </Card>

          <Card className="p-6 space-y-5">
            <h3 className="font-display text-xl text-bone tracking-crush">Founder pitch</h3>
            <Field label="Why you, why now?" hint="This appears on your investor-facing card">
              <TextArea rows={4} defaultValue="Field sales is a ₹40,000Cr problem hiding in spreadsheets. I've lived it, sold into it, and now I'm building the copilot I always wanted." />
            </Field>
          </Card>
        </div>
      </div>
    </>
  )
}
