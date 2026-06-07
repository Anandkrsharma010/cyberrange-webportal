"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import {
  api,
  setToken,
  clearToken,
  type User,
  type Entitlement,
} from "./api"
import { contentIdsEqual } from "./content-id"

// ── Context shape ───────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  entitlements: Entitlement[]
  /** Dev-only login (admin); resolves to the role string for redirect */
  devLogin: () => Promise<string>
  /** Dev-only login (participant); resolves to the role string for redirect */
  devLoginParticipant: (email?: string) => Promise<string>
  /** Google SSO login */
  ssoLogin: (idToken: string) => Promise<string>
  logout: () => Promise<void>
  /** Re-fetch /auth/me + /billing/entitlements */
  refreshUser: () => Promise<void>
  isLabEntitled: (contentId: string) => boolean
  isLabPurchased: (contentId: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ── Provider ────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [entitlements, setEntitlements] = useState<Entitlement[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchEntitlements = useCallback(async () => {
    try {
      const list = await api.entitlements()
      setEntitlements(Array.isArray(list) ? list : [])
    } catch {
      setEntitlements([])
    }
  }, [])

  const loadProfile = useCallback(async () => {
    try {
      const me = await api.me()
      setUser(me)
      await fetchEntitlements()
      return me
    } catch {
      clearToken()
      setUser(null)
      setEntitlements([])
      return null
    }
  }, [fetchEntitlements])

  // On mount: validate existing token
  useEffect(() => {
    const init = async () => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("cystar_token")
          : null
      if (token) {
        await loadProfile()
      }
      setIsLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const devLogin = useCallback(async (): Promise<string> => {
    const res = await api.devLogin()
    setToken(res.access_token)
    const me = await api.me()
    setUser(me)
    await fetchEntitlements()
    return me.role
  }, [fetchEntitlements])

  const devLoginParticipant = useCallback(async (email?: string): Promise<string> => {
    const res = await api.devLoginParticipant(email)
    setToken(res.access_token)
    const me = await api.me()
    setUser(me)
    await fetchEntitlements()
    return me.role
  }, [fetchEntitlements])

  const ssoLogin = useCallback(
    async (idToken: string): Promise<string> => {
      const res = await api.ssoCallback("google", idToken)
      setToken(res.access_token)
      const me = await api.me()
      setUser(me)
      await fetchEntitlements()
      return me.role
    },
    [fetchEntitlements],
  )

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      // token may already be invalid
    }
    clearToken()
    setUser(null)
    setEntitlements([])
  }, [])

  const refreshUser = useCallback(async () => {
    await loadProfile()
  }, [loadProfile])

  const isLabEntitled = useCallback(
    (contentId: string) =>
      entitlements.some(
        (e) =>
          e.status === "active" && contentIdsEqual(String(e.content_id), contentId),
      ),
    [entitlements],
  )

  const isLabPurchased = useCallback(
    (contentId: string) =>
      entitlements.some((e) => contentIdsEqual(String(e.content_id), contentId)),
    [entitlements],
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        entitlements,
        devLogin,
        devLoginParticipant,
        ssoLogin,
        logout,
        refreshUser,
        isLabEntitled,
        isLabPurchased,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
