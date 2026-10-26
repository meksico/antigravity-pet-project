import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthProvider'
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

describe('AuthProvider — In-Memory OAuth Token & Operator Attribution (AC-001, ADR-0002)', () => {
  it('authenticates in demo mode, stores token in memory only (never localStorage), and updates presets', async () => {
    const user = userEvent.setup()
    window.localStorage.clear()
    window.sessionStorage.clear()

    render(
      <AuthProvider>
        <AuthTestConsumer />
      </AuthProvider>,
    )

    await user.click(screen.getByText('Demo Sign In'))
    expect(screen.getByTestId('email')).toHaveTextContent('custom.operator@example.org')
    expect(screen.getByTestId('mode')).toHaveTextContent('demo')

    // Ensure no access token is ever written to localStorage or sessionStorage
    expect(JSON.stringify(window.localStorage)).not.toContain('access_token')
    expect(JSON.stringify(window.sessionStorage)).not.toContain('access_token')

    await user.click(screen.getByText('Update Presets'))
    expect(screen.getByTestId('unit')).toHaveTextContent('A1111')

    await user.click(screen.getByText('Set Sheet'))
    expect(screen.getByTestId('sheet')).toHaveTextContent('sheet-123')

    await user.click(screen.getByText('Google Sign In'))
    expect(screen.getByTestId('err')).toHaveTextContent(
      /VITE_GOOGLE_CLIENT_ID|Google Identity Services \(GIS\) скрипт ще не завантажено/i,
    )

    await user.click(screen.getByText('Sign Out'))
    expect(screen.getByTestId('email')).toHaveTextContent('anonymous')
    expect(screen.getByTestId('token')).toHaveTextContent('no-token')
  })

  it('throws when useAuth is called outside AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => render(<AuthTestConsumer />)).toThrow(/useAuth must be used within an AuthProvider/i)
    spy.mockRestore()
  })
})

