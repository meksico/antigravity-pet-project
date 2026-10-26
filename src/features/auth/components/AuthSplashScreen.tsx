import { KeyRound, Laptop, Lock, ShieldCheck } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export function AuthSplashScreen() {
  const { signInWithGoogle, signInDemo, authError } = useAuth()

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

        <h1 className="auth-splash-card__title">Картки обліку ПЕОМ</h1>
        <p className="auth-splash-card__subtitle">
          Система обліку опрацьованих лептопів та перевірки інсталяції служби захисту інформації
          (ЦРЦТіЦ). Робоча область доступна виключно авторизованим операторам.
        </p>

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

          <button
            type="button"
            className="btn-splash-secondary"
            onClick={() => signInDemo('demo.operator@example.org')}
          >
            <ShieldCheck size={16} />
            <span>Увійти в Демо-режим (синтетичні дані)</span>
          </button>
        </div>

        <p className="auth-splash-card__footnote">
          OAuth 2.0 токен зберігається виключно в оперативній памʼяті вкладки та автоматично
          очищується при закритті сторінки.
        </p>
      </div>
    </div>
  )
}
