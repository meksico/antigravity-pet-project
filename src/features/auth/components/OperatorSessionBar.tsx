import {
  Columns2,
  KeyRound,
  Laptop,
  LayoutGrid,
  LogIn,
  LogOut,
  Plus,
  Settings2,
  Table2,
} from 'lucide-react'
import { type ChangeEvent, useState } from 'react'
import type { OperatorPresets } from '../context/AuthContext'
import { useAuth } from '../hooks/useAuth'
import type { StatusFilter, WorkspaceViewMode } from '../../registry/components/RegistryFilterBar'

interface OperatorSessionBarProps {
  totalCount: number
  inProgressCount: number
  completedCount: number
  statusFilter: StatusFilter
  viewMode: WorkspaceViewMode
  onSelectStatusFilter: (status: StatusFilter) => void
  onSelectViewMode: (mode: WorkspaceViewMode) => void
  onOpenCreateCard: () => void
  onSyncWithGoogleSheets?: () => void
  isSyncing?: boolean
}

export function OperatorSessionBar({
  totalCount,
  inProgressCount,
  completedCount,
  statusFilter,
  viewMode,
  onSelectStatusFilter,
  onSelectViewMode,
  onOpenCreateCard,
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

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const handlePresetChange = (event: ChangeEvent<HTMLInputElement>) => {
    const field = event.target.name as keyof OperatorPresets
    updatePresets({ [field]: event.target.value })
  }

  return (
    <header className="top-nav-header">
      <div className="top-nav-header__main">
        {/* Left Brand */}
        <div className="brand-block">
          <div className="brand-block__logo" aria-hidden="true">
            <Laptop size={20} />
          </div>
          <h1 className="brand-block__title">Картки обліку ПЕОМ</h1>
        </div>

        {/* Center Status Tabs (with testids for KPI verification) */}
        <div className="segmented-group" role="group" aria-label="Фільтр за статусом">
          <button
            type="button"
            className={`segmented-btn ${statusFilter === 'all' ? 'segmented-btn--active' : ''}`}
            onClick={() => onSelectStatusFilter('all')}
          >
            <span>Всі (</span>
            <span data-testid="kpi-total">{totalCount}</span>
            <span>)</span>
          </button>
          <button
            type="button"
            className={`segmented-btn ${statusFilter === 'pending' ? 'segmented-btn--active' : ''}`}
            onClick={() => onSelectStatusFilter('pending')}
          >
            <span className="dot dot--muted" aria-hidden="true" />
            <span>Активні (</span>
            <span data-testid="kpi-in-progress">{inProgressCount}</span>
            <span>)</span>
          </button>
          <button
            type="button"
            className={`segmented-btn ${statusFilter === 'completed' ? 'segmented-btn--active' : ''}`}
            onClick={() => onSelectStatusFilter('completed')}
          >
            <span className="dot dot--muted" aria-hidden="true" />
            <span>Видано / Архів (</span>
            <span data-testid="kpi-completed">{completedCount}</span>
            <span>)</span>
          </button>
        </div>

        {/* Right Controls: View Switcher + Settings + Create CTA */}
        <div className="top-nav-header__actions">
          <div className="segmented-group" role="group" aria-label="Режим відображення">
            <button
              type="button"
              aria-label="Відобразити тільки картки"
              title="Відобразити тільки картки"
              className={`segmented-btn ${viewMode === 'cards' ? 'segmented-btn--active' : ''}`}
              onClick={() => onSelectViewMode('cards')}
            >
              <LayoutGrid size={14} />
              <span>Картки</span>
            </button>
            <button
              type="button"
              aria-label="Відобразити картки і таблицю"
              title="Відобразити картки і таблицю"
              className={`segmented-btn ${viewMode === 'split' ? 'segmented-btn--active' : ''}`}
              onClick={() => onSelectViewMode('split')}
            >
              <Columns2 size={14} />
              <span>Картки + Таблиця</span>
            </button>
            <button
              type="button"
              aria-label="Відобразити лише таблицю"
              title="Відобразити лише таблицю"
              className={`segmented-btn ${viewMode === 'table' ? 'segmented-btn--active' : ''}`}
              onClick={() => onSelectViewMode('table')}
            >
              <Table2 size={14} />
              <span>Таблиця</span>
            </button>
          </div>

          <button
            type="button"
            className="btn-header-ghost"
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            aria-expanded={isSettingsOpen}
            title="Налаштування Google Sheets та шаблону НСЗІ"
          >
            <Settings2 size={15} />
            <span>Шаблон НСЗІ ({presets.militaryUnit})</span>
          </button>

          <button
            type="button"
            className="btn-orange-cta"
            onClick={onOpenCreateCard}
          >
            <Plus size={16} />
            <span>Створити картку</span>
          </button>
        </div>
      </div>

      {authError && (
        <div className="top-nav-header__alert" role="alert">
          {authError}
        </div>
      )}

      {isSettingsOpen && (
        <div
          className="top-nav-header__drawer"
          role="region"
          aria-label="Налаштування Google Sheets та шаблону НСЗІ"
        >
          <div className="drawer-settings-grid">
            <div className="form-field-dark">
              <label htmlFor="spreadsheet-id-input">ID Google Таблиці</label>
              <div className="inline-input-row">
                <input
                  id="spreadsheet-id-input"
                  type="text"
                  className="input-dark"
                  placeholder="Spreadsheet ID"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  aria-label="ID Google Таблиці"
                />
                {session?.mode === 'google' && spreadsheetId && onSyncWithGoogleSheets && (
                  <button
                    type="button"
                    className="btn-header-ghost"
                    onClick={onSyncWithGoogleSheets}
                    disabled={isSyncing}
                  >
                    {isSyncing ? 'Синхронізація...' : 'Оновити'}
                  </button>
                )}
              </div>
            </div>

            <div className="form-field-dark">
              <label htmlFor="preset-unit">Військова частина за замовчуванням</label>
              <input
                id="preset-unit"
                name="militaryUnit"
                type="text"
                className="input-dark"
                value={presets.militaryUnit}
                onChange={handlePresetChange}
              />
            </div>

            <div className="form-field-dark">
              <label htmlFor="preset-rank">НСЗІ звання</label>
              <input
                id="preset-rank"
                name="infosecRank"
                type="text"
                className="input-dark"
                value={presets.infosecRank}
                onChange={handlePresetChange}
              />
            </div>

            <div className="form-field-dark">
              <label htmlFor="preset-name">НСЗІ ФІО</label>
              <input
                id="preset-name"
                name="infosecName"
                type="text"
                className="input-dark"
                value={presets.infosecName}
                onChange={handlePresetChange}
              />
            </div>

            <div className="form-field-dark">
              <label htmlFor="preset-phone">НСЗІ телефон</label>
              <input
                id="preset-phone"
                name="infosecPhone"
                type="text"
                className="input-dark"
                value={presets.infosecPhone}
                onChange={handlePresetChange}
              />
            </div>

            <div className="form-field-dark">
              <label>Сесія оператора</label>
              <div className="inline-input-row">
                {session ? (
                  <>
                    <span className="operator-chip" data-testid="active-operator-email">
                      {session.email} ({session.mode === 'google' ? 'Google OAuth' : 'Демо'})
                    </span>
                    {session.mode === 'demo' && (
                      <button
                        type="button"
                        className="btn-header-ghost"
                        onClick={() => void signInWithGoogle()}
                      >
                        <KeyRound size={13} />
                        <span>Google OAuth</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-header-ghost"
                      onClick={signOut}
                      aria-label="Вийти з сесії"
                    >
                      <LogOut size={13} />
                      <span>Вийти</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn-header-ghost"
                      onClick={() => void signInWithGoogle()}
                    >
                      <LogIn size={13} />
                      <span>Увійти через Google</span>
                    </button>
                    <button
                      type="button"
                      className="btn-header-ghost"
                      onClick={() => signInDemo('demo.operator@example.org')}
                    >
                      <span>Демо-сесія</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
