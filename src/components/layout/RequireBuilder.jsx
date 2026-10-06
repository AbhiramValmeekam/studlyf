import { RequireEcosystem } from './RequireEcosystem'

// The builder journey's gate — now just the Builder ecosystem guard: signed out → /login,
// no Builder access → /builders/onboarding. Kept as a named export for the existing routes.
export function RequireBuilder({ children }) {
  return <RequireEcosystem ecosystem="BUILDER">{children}</RequireEcosystem>
}
