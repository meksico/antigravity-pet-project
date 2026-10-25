import { createContext } from 'react'

export interface OperatorSession {
  email: string
  name: string
  mode: 'google' | 'demo'
  expiresAt: number | null
}

export interface OperatorPresets {
  militaryUnit: string
  infosecRank: string
  infosecName: string
  infosecPhone: string
  defaultLocation: string
}

export interface AuthContextValue {
  session: OperatorSession | null
  spreadsheetId: string
  setSpreadsheetId: (id: string) => void
  presets: OperatorPresets
  updatePresets: (partial: Partial<OperatorPresets>) => void
  getAccessToken: () => string | null
  signInWithGoogle: () => Promise<void>
  signInDemo: (email?: string) => void
  signOut: () => void
  authError: string | null
}

export const AuthContext = createContext<AuthContextValue | null>(null)

