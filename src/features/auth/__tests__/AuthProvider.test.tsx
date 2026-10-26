import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthProvider'
import { AUTH_STORAGE_KEY } from '../context/authStorage'
import { useAuth } from '../hooks/useAuth'

function AuthTestConsumer() {
  const {
    session,
    getAccessToken,
    signInDemo,
    signInWithGoogle,
    signOut,
    presets,
    updatePresets,
    spreadsheetId,
    setSpreadsheetId,
    authError,
  } = useAuth()
  return (
    <div>
      <span data-testid="email">{session?.email ?? 'anonymous'}</span>
      <span data-testid="mode">{session?.mode ?? 'none'}</span>
      <span data-testid="token">{getAccessToken() ?? 'no-token'}</span>
      <span data-testid="unit">{presets.militaryUnit}</span>
      <span data-testid="sheet">{spreadsheetId}</span>
      <span data-testid="err">{authError ?? ''}</span>
      <button type="button" onClick={() => signInDemo('custom.operator@example.org')}>
        Demo Sign In
      </button>
      <button type="button" onClick={() => void signInWithGoogle()}>
        Google Sign In
      </button>
      <button
        type="button"
        onClick={() => updatePresets({ militaryUnit: 'A1111', infosecName: 'Тестенко Т.Т.' })}
      >
        Update Presets
      </button>
      <button type="button" onClick={() => setSpreadsheetId('sheet-123')}>
        Set Sheet
      </button>
      <button type="button" onClick={signOut}>
        Sign Out
      </button>
    </div>
  )
}

describe('AuthProvider — Token Persistence & Session Restoration (AC-001, ADR-0002)', () => {
  it('authenticates in demo mode, updates presets, and persists session across reloads until sign out', async () => {
    const user = userEvent.setup()
    window.localStorage.clear()

    const { unmount } = render(
      <AuthProvider>
        <AuthTestConsumer />
      </AuthProvider>,
    )

    await user.click(screen.getByText('Demo Sign In'))
    expect(screen.getByTestId('email')).toHaveTextContent('custom.operator@example.org')
    expect(screen.getByTestId('mode')).toHaveTextContent('demo')
    expect(screen.getByTestId('token')).toHaveTextContent('demo-ephemeral-token')

    // Verify token and session are persisted in localStorage
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeTruthy()

    await user.click(screen.getByText('Update Presets'))
    expect(screen.getByTestId('unit')).toHaveTextContent('A1111')

    await user.click(screen.getByText('Set Sheet'))
    expect(screen.getByTestId('sheet')).toHaveTextContent('sheet-123')

    await user.click(screen.getByText('Google Sign In'))
    expect(screen.getByTestId('err')).toHaveTextContent(
      /VITE_GOOGLE_CLIENT_ID|Google Identity Services \(GIS\) скрипт ще не завантажено/i,
    )

    unmount()

    // Simulate page refresh by mounting a fresh AuthProvider
    render(
      <AuthProvider>
        <AuthTestConsumer />
      </AuthProvider>,
    )

    // Verify auth was preserved across the reload
    expect(screen.getByTestId('email')).toHaveTextContent('custom.operator@example.org')
    expect(screen.getByTestId('token')).toHaveTextContent('demo-ephemeral-token')

    // Sign out should wipe the stored token
    await user.click(screen.getByText('Sign Out'))
    expect(screen.getByTestId('email')).toHaveTextContent('anonymous')
    expect(screen.getByTestId('token')).toHaveTextContent('no-token')
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
  })

  it('restores valid Google OAuth session from storage and invalidates expired tokens', () => {
    window.localStorage.clear()

    // 1. Seed valid Google token
    const futureExpiresAt = Date.now() + 3600 * 1000
    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        token: 'valid-google-access-token',
        session: {
          email: 'officer@mil.gov.ua',
          name: 'Офіцер СЗІ',
          mode: 'google',
          expiresAt: futureExpiresAt,
        },
      }),
    )

    const { unmount } = render(
      <AuthProvider>
        <AuthTestConsumer />
      </AuthProvider>,
    )

    expect(screen.getByTestId('email')).toHaveTextContent('officer@mil.gov.ua')
    expect(screen.getByTestId('token')).toHaveTextContent('valid-google-access-token')
    expect(screen.getByTestId('mode')).toHaveTextContent('google')

    unmount()

    // 2. Seed expired Google token
    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        token: 'expired-google-token',
        session: {
          email: 'officer@mil.gov.ua',
          name: 'Офіцер СЗІ',
          mode: 'google',
          expiresAt: Date.now() - 5000,
        },
      }),
    )

    render(
      <AuthProvider>
        <AuthTestConsumer />
      </AuthProvider>,
    )

    // Expired token must be cleared and user remains anonymous
    expect(screen.getByTestId('email')).toHaveTextContent('anonymous')
    expect(screen.getByTestId('token')).toHaveTextContent('no-token')
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
  })

  it('throws when useAuth is called outside AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => render(<AuthTestConsumer />)).toThrow(/useAuth must be used within an AuthProvider/i)
    spy.mockRestore()
  })
})
