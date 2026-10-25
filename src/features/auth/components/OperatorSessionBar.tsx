import { KeyRound, LogIn, LogOut, Settings2, ShieldCheck } from 'lucide-react'
import { type ChangeEvent, useState } from 'react'
import type { OperatorPresets } from '../context/AuthContext'
import { useAuth } from '../hooks/useAuth'

interface OperatorSessionBarProps {
  onSyncWithGoogleSheets?: () => void
  isSyncing?: boolean
}

export function OperatorSessionBar({
  onSyncWithGoogleSheets,
  isSyncing = false,
}: OperatorSessionBarProps) {
  const {
    session,
    spreadsheetId,
    setSpreadsheetId,
    presets,
    updatePresets,
    signInWithGoogle,
    signInDemo,
    signOut,
    authError,
  } = useAuth()

  const [isPresetsOpen, setIsPresetsOpen] = useState(false)

  const handlePresetChange = (event: ChangeEvent<HTMLInputElement>) => {
    const field = event.target.name as keyof OperatorPresets
    updatePresets({ [field]: event.target.value })
  }

  return (
    <header className="session-bar">
      <div className="session-bar__brand">
        <div className="session-bar__logo" aria-hidden="true">
          <ShieldCheck size={22} />
        </div>
        <div>
          <h1 className="session-bar__title">ЦРЦТіЦ — Облік опрацьованих лептопів</h1>
          <p className="session-bar__subtitle">
            Реєстр підготовки, захисту (НСЗІ / ESET) та видачі ПЕОМ • 28 колонок Google Sheets
          </p>
        </div>
      </div>

      <div className="session-bar__controls">
        <div className="session-bar__sheet-input">
          <label htmlFor="spreadsheet-id-input" className="sr-only">
            ID Google Таблиці
          </label>
          <input
            id="spreadsheet-id-input"
            type="text"
            className="input input--sm"
            placeholder="Spreadsheet ID (необовʼязково в демо)"
            value={spreadsheetId}
            onChange={(e) => setSpreadsheetId(e.target.value)}
            aria-label="ID Google Таблиці"
          />
          {session?.mode === 'google' && spreadsheetId && onSyncWithGoogleSheets && (
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={onSyncWithGoogleSheets}
              disabled={isSyncing}
            >
              {isSyncing ? 'Синхронізація...' : 'Оновити з Sheets'}
            </button>
          )}
        </div>

        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => setIsPresetsOpen((prev) => !prev)}
          aria-expanded={isPresetsOpen}
        >
          <Settings2 size={15} />
          <span>Шаблон НСЗІ ({presets.militaryUnit})</span>
        </button>

        {session ? (
          <div className="session-bar__user">
            <span
              className={`badge ${session.mode === 'google' ? 'badge--success' : 'badge--info'}`}
            >
              {session.mode === 'google' ? 'Google OAuth 2.0' : 'Демо-режим'}
            </span>
            <span className="session-bar__email" data-testid="active-operator-email">
              {session.email}
            </span>
            {session.mode === 'demo' && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => void signInWithGoogle()}
              >
                <KeyRound size={14} />
                <span>Увійти через Google</span>
              </button>
            )}
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={signOut}
              aria-label="Вийти з сесії"
            >
              <LogOut size={14} />
              <span>Вийти</span>
            </button>
          </div>
        ) : (
          <div className="session-bar__user">
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => void signInWithGoogle()}
            >
              <LogIn size={14} />
              <span>Увійти через Google</span>
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => signInDemo('demo.operator@example.org')}
            >
              <span>Демо-сесія</span>
            </button>
          </div>
        )}
      </div>

      {authError && (
        <div className="session-bar__alert" role="alert">
          {authError}
        </div>
      )}

      {isPresetsOpen && (
        <div className="session-bar__presets" role="region" aria-label="Налаштування шаблону НСЗІ">
          <div className="form-field">
            <label htmlFor="preset-unit">Військова частина за замовчуванням</label>
            <input
              id="preset-unit"
              name="militaryUnit"
              type="text"
              className="input input--sm"
              value={presets.militaryUnit}
              onChange={handlePresetChange}
            />
          </div>
          <div className="form-field">
            <label htmlFor="preset-rank">НСЗІ звання</label>
            <input
              id="preset-rank"
              name="infosecRank"
              type="text"
              className="input input--sm"
              value={presets.infosecRank}
              onChange={handlePresetChange}
            />
          </div>
          <div className="form-field">
            <label htmlFor="preset-name">НСЗІ ФІО</label>
            <input
              id="preset-name"
              name="infosecName"
              type="text"
              className="input input--sm"
              value={presets.infosecName}
              onChange={handlePresetChange}
            />
          </div>
          <div className="form-field">
            <label htmlFor="preset-phone">НСЗІ телефон</label>
            <input
              id="preset-phone"
              name="infosecPhone"
              type="text"
              className="input input--sm"
              value={presets.infosecPhone}
              onChange={handlePresetChange}
            />
          </div>
        </div>
      )}
    </header>
  )
}

