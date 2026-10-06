import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

export function useFounderProfile() {
  return useQuery({ queryKey: ['founder', 'profile'], queryFn: () => api.founderProfile().then((r) => r.data) })
}

/** PATCH the founder profile and keep every founder view (profile, dashboard, /me) in sync. */
export function useSaveFounder() {
  const qc = useQueryClient()
  const { refresh } = useAuth()
  return async (body) => {
    const { data } = await api.updateFounderProfile(body)
    qc.setQueryData(['founder', 'profile'], data)
    qc.invalidateQueries({ queryKey: ['founder', 'dashboard'] })
    refresh()
    return data
  }
}

const LEVEL = {
  INVESTOR_READY: ['Investor ready', 'text-acid'],
  TAKING_SHAPE: ['Taking shape', 'text-violet'],
  EARLY: ['Early', 'text-amber-300'],
  GETTING_STARTED: ['Getting started', 'text-mute'],
}

export function ReadinessMeter({ readiness, compact = false }) {
  const [text, color] = LEVEL[readiness.level] || LEVEL.GETTING_STARTED
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <p className="display-face text-6xl text-bone">
          {readiness.score}
          <span className="text-2xl text-mute">/100</span>
        </p>
        <span className={`text-sm font-medium ${color}`}>{text}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-line/10" role="progressbar" aria-valuenow={readiness.score} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-violet transition-all" style={{ width: `${readiness.score}%` }} />
      </div>
      {!compact && (
        <ul className="mt-6 space-y-3">
          {readiness.areas.map((a) => (
            <li key={a.key} className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-3 text-sm">
              <span className="text-bone">{a.label}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-line/10">
                <span className="block h-full rounded-full bg-violet/80" style={{ width: `${(a.score / a.weight) * 100}%` }} />
              </span>
              <span className="text-right font-mono text-xs text-mute">
                {a.score}/{a.weight}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Where to fix each readiness area. */
export const AREA_LINK = {
  problem: '/founders/workspace#problem',
  market: '/founders/workspace/market',
  product: '/founders/startup',
  team: '/founders/startup#team',
  traction: '/founders/traction',
  businessModel: '/founders/workspace/business-model',
  gtm: '/founders/workspace/gtm',
  pitch: '/founders/workspace/pitch-deck',
}
