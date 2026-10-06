import { createContext, useContext, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const qc = useQueryClient()

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const { data } = await api.me()
        return data
      } catch (err) {
        // 401 just means "signed out" — a normal state, not an error to surface.
        if (err instanceof ApiError && err.status === 401) return null
        throw err
      }
    },
    staleTime: 60 * 1000,
    retry: false,
  })

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ['me'] }), [qc])

  const login = useCallback(
    async (credentials) => {
      const { data } = await api.login(credentials)
      qc.setQueryData(['me'], data.user)
      return data.user
    },
    [qc],
  )

  const register = useCallback(
    async (payload) => {
      const { data } = await api.register(payload)
      qc.setQueryData(['me'], data.user)
      return data.user
    },
    [qc],
  )

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } finally {
      qc.setQueryData(['me'], null)
      qc.clear()
    }
  }, [qc])

  // Ecosystem access comes from the server-computed `user.ecosystems` — never from roles the
  // client guesses at. `isBuilder` stays for the existing builder pages.
  const ecosystems = user?.ecosystems ?? {}
  const value = {
    user: user ?? null,
    isLoading,
    isAuthed: !!user,
    ecosystems,
    hasEcosystem: (key) => !!ecosystems[key]?.active,
    isBuilder: ecosystems.BUILDER ? !!ecosystems.BUILDER.active : !!user?.roles?.includes('BUILDER'),
    isAdmin: !!user?.admin,
    login,
    register,
    logout,
    refresh,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
