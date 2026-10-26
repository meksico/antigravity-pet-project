import type { OperatorSession } from './AuthContext'

export const AUTH_STORAGE_KEY = 'peom_operator_auth_v1'

export interface StoredAuthData {
  token: string
  session: OperatorSession
}

export function loadStoredAuth(): StoredAuthData | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredAuthData
    if (!parsed?.token || !parsed?.session?.email || !parsed?.session?.mode) {
      return null
    }
    // Check expiry for Google session
    if (parsed.session.mode === 'google' && parsed.session.expiresAt) {
      // Invalidate if token is expired or within 30 seconds of expiry
      if (Date.now() >= parsed.session.expiresAt - 30_000) {
        localStorage.removeItem(AUTH_STORAGE_KEY)
        return null
      }
    }
    return parsed
  } catch {
    return null
  }
}

export function saveStoredAuth(token: string, session: OperatorSession): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, session }))
  } catch {
    // Ignore storage quota errors in restricted contexts
  }
}

export function clearStoredAuth(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch {
    // Ignore storage errors
  }
}
