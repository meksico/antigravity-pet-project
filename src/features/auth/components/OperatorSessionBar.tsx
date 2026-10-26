import {
  Columns2,
  Laptop,
  LayoutGrid,
  LogOut,
  Plus,
  RefreshCw,
  Table2,
} from 'lucide-react'
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
  const { session, signOut, authError } = useAuth()

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

        {/* Right Controls: View Switcher + Session actions + Create CTA */}
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

          {session && (
            <button
              type="button"
              className="btn-header-ghost"
              onClick={signOut}
              title={`Вийти з сесії (${session.email})`}
              aria-label="Вийти з сесії"
            >
              <LogOut size={14} />
              <span>Вийти</span>
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
