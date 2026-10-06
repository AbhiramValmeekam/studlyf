import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ECOSYSTEM_KEYS, engagedEcosystems, lastEcosystem, parseRole, rememberEcosystem, resolveDestination } from '../lib/ecosystems'
import { track } from '../lib/analytics'
import { useSeo } from '../lib/seo'
import { EcosystemSelector } from '../components/ecosystem/EcosystemSelector'

/**
 * /choose — the EcosystemSelector after login.
 *   several ecosystems → "Where do you want to go?" (only the ones this account actually has)
 *   none yet           → "Choose your path"
 * Starting a new path goes to that ecosystem's onboarding / access request — never a dashboard.
 */
export default function ChoosePath() {
  const { user, isAdmin } = useAuth()
  const [params] = useSearchParams()
  useSeo({ title: 'Choose your ecosystem | STUDLYF', description: 'Pick where to go on STUDLYF.', path: '/choose' })

  const engaged = engagedEcosystems(user)
  const fresh = ECOSYSTEM_KEYS.filter((k) => !engaged.includes(k))
  const adding = params.get('add') === '1'

  return (
    <div className="wrap pb-24 pt-36 md:pt-44">
      <p className="eyebrow mb-4">{engaged.length ? 'Your ecosystems' : 'Welcome to STUDLYF'}</p>
      <h1 className="display-face text-balance text-[clamp(2.4rem,6vw,4.8rem)] leading-[0.95] tracking-tight">
        {engaged.length && !adding ? 'Where do you want to go?' : adding ? 'Add an ecosystem.' : 'Choose your path.'}
      </h1>
      <p className="mt-4 max-w-xl text-mute">
        {engaged.length
          ? 'Your account works across every ecosystem you’ve joined. Pick one — you can come back here any time from the logo.'
          : 'Tell us where to start. You can add other ecosystems to the same account later.'}
      </p>

      {engaged.length > 0 && !adding && (
        <div className="mt-10">
          <EcosystemSelector
            keys={engaged}
            statusOf={(k) => user.ecosystems[k].status}
            hrefOf={(k) => user.ecosystems[k].destination}
            onPick={(k) => user.ecosystems[k].active && rememberEcosystem(k)}
          />
        </div>
      )}

      {fresh.length > 0 && (
        <div className={engaged.length && !adding ? 'mt-16 border-t border-line/10 pt-10' : 'mt-10'}>
          {engaged.length > 0 && !adding && <h2 className="display-face mb-6 text-3xl tracking-tight">Start something new</h2>}
          <EcosystemSelector
            keys={fresh}
            hrefOf={(k) => user.ecosystems?.[k]?.destination || `/signup?role=${k}`}
            onPick={(k) => track('onboarding_started', { ecosystem: k, source: 'choose_path' })}
          />
        </div>
      )}

      {isAdmin && (
        <p className="mt-12 text-sm text-mute">
          Staff account?{' '}
          <Link to="/admin" className="text-acid hover:underline">
            Open the admin console
          </Link>
        </p>
      )}
    </div>
  )
}

/**
 * /go?role=… — the PostLoginRedirect. Used by the logo and by links that should "take me to my
 * STUDLYF": prefers the requested ecosystem, then the one used last (if still active), then the
 * shared resolver's rules (single ecosystem → it; several → /choose).
 */
export function PostLogin() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const requested = parseRole(params.get('role'))
  const last = lastEcosystem()
  const intent = requested || (last && user?.ecosystems?.[last]?.active ? last : null)
  return <Navigate to={resolveDestination(user, { intent })} replace />
}
