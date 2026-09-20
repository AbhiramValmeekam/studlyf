import { RevealText, FadeUp } from '../components/AnimatedText'
import { contact } from '../data/studlyf'

export default function Contact() {
  return (
    <section id="contact" className="relative py-[16vh] gutter overflow-hidden">
      <p className="eyebrow text-acid mb-6">{contact.title}</p>
      <RevealText
        lines={['Contact', 'us.']}
        className="font-display d-hero text-bone tracking-crush"
      />

      <div className="mt-[8vh] grid md:grid-cols-12 gap-y-12 md:gap-10 items-start">
        {/* founder card */}
        <FadeUp className="md:col-span-5">
          <div className="rounded-[4px] border border-bone/12 overflow-hidden bg-ink2">
            <div className="relative h-72 overflow-hidden">
              <img
                src={contact.founderImg}
                alt={contact.founderName}
                loading="lazy"
                className="h-full w-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink2 to-transparent" />
            </div>
            <div className="p-6">
              <p className="eyebrow text-bone2">{contact.founderLabel}</p>
              <h3 className="font-display text-3xl text-bone mt-2">{contact.founderName}</h3>
              <div className="mt-5 flex gap-3">
                {contact.channels.map((c) => (
                  <span
                    key={c}
                    className="eyebrow rounded-full border border-bone/25 px-4 py-2 text-bone2 hover:bg-acid hover:text-ink hover:border-acid transition-colors"
                    data-cursor="hover"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </FadeUp>

        {/* inquiry */}
        <FadeUp className="md:col-span-6 md:col-start-7">
          <p className="text-2xl md:text-3xl serif-i text-bone leading-snug">{contact.sub}</p>
          <div className="mt-10 space-y-4">
            <input
              type="text"
              placeholder="Your name"
              className="w-full bg-transparent border-b border-bone/20 py-4 text-bone placeholder:text-bone2 focus:border-acid outline-none transition-colors"
            />
            <input
              type="email"
              placeholder="Your email"
              className="w-full bg-transparent border-b border-bone/20 py-4 text-bone placeholder:text-bone2 focus:border-acid outline-none transition-colors"
            />
            <textarea
              rows={3}
              placeholder="Tell us about your goals"
              className="w-full bg-transparent border-b border-bone/20 py-4 text-bone placeholder:text-bone2 focus:border-acid outline-none transition-colors resize-none"
            />
          </div>
          <div className="mt-8 flex items-center justify-between gap-6 flex-wrap">
            <span className="eyebrow text-bone2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-acid animate-pulse" />
              {contact.secured}
            </span>
            <button
              className="inline-flex items-center gap-3 rounded-full bg-acid text-ink px-8 py-4 font-medium"
              data-cursor="hover"
              data-cursor-label="Send"
            >
              {contact.cta} ↗
            </button>
          </div>
          <p className="mt-6 eyebrow text-bone2">{contact.note}</p>
        </FadeUp>
      </div>
    </section>
  )
}
