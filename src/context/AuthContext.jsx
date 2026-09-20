import { createContext, useContext, useState, useCallback } from 'react'

/**
 * Fake auth for the prototype. No real backend — `login(role)` simply records
 * which persona is "signed in" so shells and ProtectedRoute can react. State is
 * in-memory and resets on refresh (by design for the MVP).
 */
const AuthContext = createContext(null)

// Human-friendly demo identities per role, reused across shells + topbars.
const PROFILES = {
  builder: { name: 'Aarav Menon', handle: '@aaravbuilds', role: 'builder', title: 'CS Undergrad · Builder' },
  founder: { name: 'Ishita Rao', handle: '@ishitabuilds', role: 'founder', title: 'Founder · Loopwise' },
  investor: { name: 'Kabir Shah', handle: '@kabir.vc', role: 'investor', title: 'Partner · Northstar Capital' },
  hr: { name: 'Meera Iyer', handle: '@meera.talent', role: 'hr', title: 'Head of Talent · Cygnus' },
  // Organization — runs hackathons/challenges and evaluates participants via the platform
  org: { name: 'Priya Nambiar', handle: '@priya.orgs', role: 'org', title: 'Program Lead · TechOrg India' },
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  const login = useCallback((role) => {
    const profile = PROFILES[role] || PROFILES.builder
    setUser(profile)
    return profile
  }, [])

  const logout = useCallback(() => setUser(null), [])

  return (
    <AuthContext.Provider value={{ user, role: user?.role || null, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export { PROFILES }
