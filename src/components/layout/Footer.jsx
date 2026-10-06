import { Link } from 'react-router-dom'
import { brand } from '../../data/studlyf'

const groups = [
  {
    title: 'Explore',
    links: [
      { label: 'Opportunities', to: '/opportunities' },
      { label: 'Resources', to: '/resources' },
      { label: 'Search', to: '/search' },
      { label: 'Saved', to: '/saved' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Join STUDLYF', to: '/register' },
      { label: 'Log in', to: '/login' },
      { label: 'Your account', to: '/account' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="relative border-t border-line/10 bg-ink pt-20">
      <div className="wrap">
        <div className="grid gap-14 pb-16 md:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
          <div>
            <Link to="/" className="display-face text-4xl tracking-crush">
              STUDLYF<span className="text-acid">.</span>
            </Link>
            <p className="mt-5 max-w-sm text-mute">{brand.tagline}</p>
          </div>
          {groups.map((g) => (
            <nav key={g.title} aria-label={g.title}>
              <p className="eyebrow mb-5">{g.title}</p>
              <ul className="space-y-3">
                {g.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-mute transition-colors hover:text-bone">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div>
            <p className="eyebrow mb-5">Connect</p>
            <ul className="space-y-3">
              <li>
                <a href={`mailto:${brand.email}`} className="text-mute transition-colors hover:text-bone">
                  {brand.email}
                </a>
              </li>
              <li>
                <a href={brand.instagram} target="_blank" rel="noreferrer" className="text-mute transition-colors hover:text-bone">
                  Instagram
                </a>
              </li>
              <li>
                <a href={brand.whatsapp} target="_blank" rel="noreferrer" className="text-mute transition-colors hover:text-bone">
                  WhatsApp channel
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Oversized wordmark strip */}
        <div className="overflow-hidden border-t border-line/10 py-8">
          <p className="display-face select-none whitespace-nowrap text-[18vw] leading-none tracking-crush text-bone/[0.05]">
            STUDLYF
          </p>
        </div>

        <div className="flex flex-col items-start justify-between gap-4 border-t border-line/10 py-8 text-sm text-mute md:flex-row md:items-center">
          <p>{brand.copyright}</p>
          <p className="font-mono text-xs">Empowering the next generation of engineers.</p>
        </div>
      </div>
    </footer>
  )
}
