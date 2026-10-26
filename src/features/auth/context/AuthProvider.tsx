import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  AuthContext,
  type OperatorPresets,
  type OperatorSession,
} from './AuthContext'
import {
  AUTH_STORAGE_KEY,
  clearStoredAuth,
  loadStoredAuth,
  saveStoredAuth,
} from './authStorage'

interface GoogleTokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

interface GoogleTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: GoogleTokenResponse) => void
          }) => GoogleTokenClient
          revoke?: (token: string, done?: () => void) => void
        }
      }
    }
  }
}

const DEFAULT_PRESETS: OperatorPresets = {
  militaryUnit: 'A0000',
  infosecRank: 'старший лейтенант',
  infosecName: 'Сидоренко І.В.',
  infosecPhone: '0999008000',
  defaultLocation: 'ППД',
}

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'openid',
  'email',
  'profile',
].join(' ')

interface AuthProviderProps {
  children: ReactNode
  initialDemoSession?: boolean
}

/**
 * Google Identity Services (GIS) OAuth 2.0 Provider (AC-001, ADR-0002).
 * Persists session and access token in localStorage so user session survives page refreshes.
 */
export function AuthProvider({ children, initialDemoSession = false }: AuthProviderProps) {
  const initialAuth = useMemo(() => {
    if (initialDemoSession) {
      return {
        token: 'demo-ephemeral-token',
        session: {
          email: 'demo.operator@example.org',
          name: 'Демо Оператор (ЦРЦТіЦ)',
          mode: 'demo' as const,
          expiresAt: null,
        },
      }
    }
    return loadStoredAuth()
  }, [initialDemoSession])

  const tokenRef = useRef<string | null>(initialAuth?.token ?? null)
  const [session, setSession] = useState<OperatorSession | null>(initialAuth?.session ?? null)
  const [spreadsheetId, setSpreadsheetId] = useState<string>(
    import.meta.env.VITE_SPREADSHEET_ID ?? '',
  )
  const [presets, setPresets] = useState<OperatorPresets>(DEFAULT_PRESETS)
  const [authError, setAuthError] = useState<string | null>(null)

  const getAccessToken = useCallback(() => tokenRef.current, [])

  const updatePresets = useCallback((partial: Partial<OperatorPresets>) => {
    setPresets((prev) => ({ ...prev, ...partial }))
  }, [])

  const signOut = useCallback(() => {
    const currentToken = tokenRef.current
    tokenRef.current = null
    setSession(null)
    setAuthError(null)
    clearStoredAuth()
    if (currentToken && currentToken !== 'demo-ephemeral-token') {
      window.google?.accounts?.oauth2?.revoke?.(currentToken)
    }
  }, [])

  // Auto-logout when Google token expires
  useEffect(() => {
    if (session?.mode !== 'google' || !session.expiresAt) return
    const timeLeft = Math.max(0, session.expiresAt - Date.now())
    const timer = window.setTimeout(() => {
      signOut()
    }, timeLeft)
    return () => {
      window.clearTimeout(timer)
    }
  }, [session, signOut])

  // Sync auth across multiple browser tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === AUTH_STORAGE_KEY) {
        if (!e.newValue) {
          tokenRef.current = null
          setSession(null)
        } else {
          const auth = loadStoredAuth()
          tokenRef.current = auth?.token ?? null
          setSession(auth?.session ?? null)
        }
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const signInDemo = useCallback((email = 'demo.operator@example.org') => {
    const demoSession: OperatorSession = {
      email: email.trim(),
      name: 'Оператор (Демо-режим)',
      mode: 'demo',
      expiresAt: null,
    }
    tokenRef.current = 'demo-ephemeral-token'
    setAuthError(null)
    setSession(demoSession)
    saveStoredAuth('demo-ephemeral-token', demoSession)
  }, [])

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null)
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      setAuthError(
        'VITE_GOOGLE_CLIENT_ID не налаштовано в .env. Використовуйте Демо-режим або додайте OAuth Client ID.',
      )
      return
    }

    const oauth2 = window.google?.accounts?.oauth2
    if (!oauth2) {
      setAuthError('Google Identity Services (GIS) скрипт ще не завантажено.')
      return
    }

    await new Promise<void>((resolve) => {
      const client = oauth2.initTokenClient({
        client_id: clientId,
        scope: GOOGLE_SCOPES,
        callback: async (response: GoogleTokenResponse) => {
          if (response.error || !response.access_token) {
            setAuthError(response.error_description ?? response.error ?? 'Помилка OAuth авторизації')
            resolve()
            return
          }

          tokenRef.current = response.access_token
          const expiresAt = Date.now() + (response.expires_in ?? 3599) * 1000

          let newSession: OperatorSession
          try {
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${response.access_token}` },
            })
            if (userInfoRes.ok) {
              const profile = (await userInfoRes.json()) as { email?: string; name?: string }
              newSession = {
                email: profile.email ?? 'operator@google.workspace',
                name: profile.name ?? profile.email ?? 'Оператор Google',
                mode: 'google',
                expiresAt,
              }
            } else {
              newSession = {
                email: 'operator@google.workspace',
                name: 'Оператор Google',
                mode: 'google',
                expiresAt,
              }
            }
          } catch {
            newSession = {
              email: 'operator@google.workspace',
              name: 'Оператор Google',
              mode: 'google',
              expiresAt,
            }
          }

          setSession(newSession)
          saveStoredAuth(response.access_token, newSession)
          resolve()
        },
      })
      client.requestAccessToken({ prompt: 'select_account' })
    })
  }, [])

  const value = useMemo(
    () => ({
      session,
      spreadsheetId,
      setSpreadsheetId,
      presets,
      updatePresets,
      getAccessToken,
      signInWithGoogle,
      signInDemo,
      signOut,
      authError,
    }),
    [
      session,
      spreadsheetId,
      presets,
      updatePresets,
      getAccessToken,
      signInWithGoogle,
      signInDemo,
      signOut,
      authError,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
