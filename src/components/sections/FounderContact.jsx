import { useState } from 'react'
import { motion } from 'framer-motion'
import { Avatar } from '../ui/atoms'
import { Button, ArrowIcon } from '../ui/Button'
import { Input, Textarea, FormField } from '../ui/Field'
import { brand, founder } from '../../data/studlyf'
import { EASE, inView } from '../../lib/motion'

export function FounderContact() {
  const [sent, setSent] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    // No public inquiry endpoint in Phase 1 — acknowledge locally.
    setSent(true)
  }

  return (
    <section className="relative py-28 md:py-36">
      <div className="wrap grid gap-14 lg:grid-cols-2">
        {/* Founder */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={inView}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <p className="eyebrow mb-4 flex items-center gap-3">
            <span className="inline-block h-px w-8 bg-acid" />
            Contact
          </p>
          <h2 className="display-face text-huge text-balance">Get in touch.</h2>
          <p className="mt-5 max-w-md text-lede text-mute">
            Have a question or an opportunity to share? We’d love to hear from you.
          </p>

          <div className="mt-10 flex flex-wrap gap-8">
            {[founder, founder.coFounder].map((person) => (
              <div key={person.name} className="flex items-center gap-4">
                <Avatar src={person.photo} name={person.name} size={60} className="ring-1 ring-line/10" />
                <div>
                  <p className="font-semibold text-bone">{person.name}</p>
                  <p className="text-sm text-mute">{person.role}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <a href={`mailto:${brand.email}`} className="rounded-full border border-line/15 px-5 py-2.5 text-sm text-bone hover:border-line/40">
              {brand.email}
            </a>
            <a href={brand.instagram} target="_blank" rel="noreferrer" className="rounded-full border border-line/15 px-5 py-2.5 text-sm text-bone hover:border-line/40">
              Instagram
            </a>
            <a href={brand.whatsapp} target="_blank" rel="noreferrer" className="rounded-full border border-line/15 px-5 py-2.5 text-sm text-bone hover:border-line/40">
              WhatsApp channel
            </a>
          </div>
        </motion.div>

        {/* Inquiry form */}
        <motion.div
          className="card-surface p-8 md:p-10"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={inView}
          transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
        >
          {sent ? (
            <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-acid text-2xl text-ink">✓</div>
              <p className="mt-5 display-face text-2xl tracking-tight">Thanks — we’ll be in touch.</p>
              <p className="mt-2 text-sm text-mute">Your inquiry has been noted.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <h3 className="display-face text-2xl tracking-tight">Submit an inquiry</h3>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Name" htmlFor="c-name">
                  <Input id="c-name" required />
                </FormField>
                <FormField label="Email" htmlFor="c-email">
                  <Input id="c-email" type="email" required />
                </FormField>
              </div>
              <FormField label="Message" htmlFor="c-msg">
                <Textarea id="c-msg" placeholder="How can we help?" required />
              </FormField>
              <Button type="submit" magnetic={false}>
                Submit inquiry <ArrowIcon />
              </Button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  )
}
