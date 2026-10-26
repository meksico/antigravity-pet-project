import { KeyRound, Laptop, Lock } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export function AuthSplashScreen() {
  const { signInWithGoogle, authError } = useAuth()

  return (
    <div className="auth-splash-backdrop" data-testid="auth-splash-screen">
      <div className="auth-splash-card" role="region" aria-label="Авторизація оператора">
        <div className="auth-splash-card__logo" aria-hidden="true">
          <Laptop size={30} />
        </div>

        <div className="auth-splash-card__badge">
          <Lock size={12} aria-hidden="true" />
          <span>Доступ обмежено • Потрібна авторизація</span>
        </div>

        {authError && (
          <div className="auth-splash-card__alert" role="alert">
            {authError}
          </div>
        )}

        <div className="auth-splash-card__actions">
          <button
            type="button"
            className="btn-splash-primary"
            onClick={() => void signInWithGoogle()}
          >
            <KeyRound size={18} />
            <span>Авторизуватися через Google</span>
          </button>
        </div>
      </div>
    </div>
  )
}
