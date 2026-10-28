import {
  CheckCircle2,
  Columns2,
  Laptop,
  LayoutGrid,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  Table2,
  User,
} from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import type { StatusFilter, WorkspaceViewMode } from '../../registry/components/RegistryFilterBar'

interface OperatorSessionBarProps {
  totalCount: number
  inProgressCount: number
  completedCount: number
  maxId?: number | null
  maxInventoryNumber?: number | string | null
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
  maxId,
  maxInventoryNumber,
  statusFilter,
  viewMode,
  onSelectStatusFilter,
  onSelectViewMode,
  onOpenCreateCard,
  onSyncWithGoogleSheets,
  isSyncing = false,
}: OperatorSessionBarProps) {
  const { session, signOut, authError } = useAuth()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const popupId = useId()

  // Close profile popup when clicking outside or pressing Escape
  useEffect(() => {
    if (!isProfileOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isProfileOpen])

  // Generate 2-letter initials for avatar badge
  const initials = (() => {
    if (!session) return '?'
    const raw = session.name || session.email || ''
    const parts = raw.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return raw.slice(0, 2).toUpperCase() || 'OP'
  })()

  return (
    <header className="top-nav-header">
      <div className="top-nav-header__main">
        {/* Left Brand */}
        <div className="brand-block">
          <div className="brand-block__logo" aria-hidden="true">
            <Laptop size={20} />
          </div>
          <h1 className="brand-block__title">Картки обліку ПЕОМ</h1>

          <div className="brand-block__stats" role="group" aria-label="Максимальні індекси реєстру">
            <span
              className="brand-stat-pill"
              title="Найбільший ID серед усіх карток"
            >
              <span className="brand-stat-pill__label">ID:</span>
              <strong className="brand-stat-pill__value" data-testid="brand-max-id">
                {maxId !== null && maxId !== undefined ? maxId : '—'}
              </strong>
            </span>
            <span
              className="brand-stat-pill"
              title="Найбільший інвентарний номер (Инв.н.) серед усіх карток"
            >
              <span className="brand-stat-pill__label">Инв.н.:</span>
              <strong className="brand-stat-pill__value" data-testid="brand-max-inventory">
                {maxInventoryNumber !== null && maxInventoryNumber !== undefined
                  ? maxInventoryNumber
                  : '—'}
              </strong>
            </span>
          </div>
        </div>

        {/* Right Actions: Sync + Create CTA + User Avatar in Top-Right Corner */}
        <div className="top-nav-header__actions">
          {session?.mode === 'google' && onSyncWithGoogleSheets && (
            <button
              type="button"
              className="btn-header-ghost"
              onClick={onSyncWithGoogleSheets}
              disabled={isSyncing}
              title="Синхронізувати з Google Sheets"
              aria-label="Оновити дані з Google Sheets"
            >
              <RefreshCw size={14} className={isSyncing ? 'spin' : ''} />
              <span>{isSyncing ? 'Синхронізація...' : 'Синхронізувати'}</span>
            </button>
          )}

          <button
            type="button"
            className="btn-orange-cta"
            onClick={onOpenCreateCard}
          >
            <Plus size={16} />
            <span>Створити картку</span>
          </button>

          {/* User Avatar & Profile Popup in Top-Right Corner */}
          {session && (
            <div className="user-profile-menu" ref={profileRef}>
              <button
                type="button"
                className="user-avatar-btn"
                onClick={() => setIsProfileOpen((prev) => !prev)}
                aria-expanded={isProfileOpen}
                aria-haspopup="dialog"
                aria-controls={popupId}
                aria-label={`Профіль оператора: ${session.name || session.email}`}
                title={`Профіль: ${session.name || session.email}`}
              >
                <span className="user-avatar-initials">{initials}</span>
                <span className="user-avatar-status-dot" aria-hidden="true" />
              </button>

              {isProfileOpen && (
                <div
                  id={popupId}
                  className="user-profile-popup"
                  role="dialog"
                  aria-label="Інформація про оператора"
                >
                  <div className="user-profile-popup__header">
                    <div className="user-profile-popup__avatar" aria-hidden="true">
                      {initials}
                    </div>
                    <div className="user-profile-popup__details">
                      <div className="user-profile-popup__name" title={session.name}>
                        <User size={13} className="text-muted" aria-hidden="true" />
                        <span>{session.name || 'Оператор'}</span>
                      </div>
                      <div className="user-profile-popup__email" title={session.email}>
                        <Mail size={13} className="text-muted" aria-hidden="true" />
                        <span>{session.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="user-profile-popup__meta">
                    <span className="user-profile-mode-badge">
                      <CheckCircle2 size={12} aria-hidden="true" />
                      <span>
                        {session.mode === 'google'
                          ? 'Google OAuth 2.0 авторизовано'
                          : 'Демо-сесія (синтетичні дані)'}
                      </span>
                    </span>
                  </div>

                  <div className="user-profile-popup__footer">
                    <button
                      type="button"
                      className="btn-profile-logout"
                      onClick={() => {
                        setIsProfileOpen(false)
                        signOut()
                      }}
                      aria-label="Вийти з сесії"
                    >
                      <LogOut size={14} />
                      <span>Вийти з акаунту</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls: Status Filter Tabs (Left side) + Representation View Switcher (Right side) on the same line */}
        <div className="top-nav-header__controls">
          {/* Status Filter Tabs (Left side) */}
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
              <span className="dot dot--green" aria-hidden="true" />
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

          {/* Representation View Switcher (Right side) */}
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
        </div>
      </div>

      {authError && (
        <div className="top-nav-header__alert" role="alert">
          {authError}
        </div>
      )}
    </header>
  )
}
