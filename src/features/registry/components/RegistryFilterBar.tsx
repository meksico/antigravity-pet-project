import { ArrowUpDown, Download, Filter, RotateCcw, Search, X } from 'lucide-react'
import { useMemo } from 'react'
import type { LaptopRecord, ReferenceDictionaries } from '../../../schemas/laptopRecordSchema'

export type StatusFilter = 'all' | 'pending' | 'completed'
export type ColumnGroupMode = 'compact' | 'all' | 'security' | 'custodians'
export type WorkspaceViewMode = 'cards' | 'split' | 'table'
export type IdSortDirection = 'desc' | 'asc'

export interface RegistryFiltersState {
  searchQuery: string
  status: StatusFilter
  responsible: string
  subdivision: string
  network: string
  asType: string
  securityClassification: string
  columnGroup: ColumnGroupMode
  sortDirection: IdSortDirection
  viewMode: WorkspaceViewMode
}

interface RegistryFilterBarProps {
  records: readonly LaptopRecord[]
  filteredCount: number
  filters: RegistryFiltersState
  dictionaries: ReferenceDictionaries
  onUpdateFilters: (partial: Partial<RegistryFiltersState>) => void
  onResetFilters: () => void
  onExportCsv: () => void
}

export function RegistryFilterBar({
  records,
  filteredCount,
  filters,
  onUpdateFilters,
  onResetFilters,
  onExportCsv,
}: RegistryFilterBarProps) {
  const responsibleOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of records) {
      const name = r.responsibleName.trim()
      if (name) {
        counts.set(name, (counts.get(name) ?? 0) + 1)
      }
    }
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0], 'uk'))
  }, [records])

  const hasActiveFilters =
    filters.searchQuery.trim() !== '' ||
    filters.status !== 'all' ||
    filters.responsible !== 'all' ||
    filters.subdivision !== 'all' ||
    filters.network !== 'all'

  return (
    <section className="dark-toolbar" aria-label="Фільтрація, пошук та сортування">
      <div className="dark-toolbar__row">
        {/* Responsible Filter Dropdown matching Screenshot 2 & 14 */}
        <div className="responsible-filter-pill">
          <Filter size={14} className="text-orange" aria-hidden="true" />
          <span className="responsible-filter-pill__label">Відповідальний:</span>
          <select
            aria-label="Фільтр відповідального"
            className="responsible-filter-pill__select"
            value={filters.responsible}
            onChange={(e) => onUpdateFilters({ responsible: e.target.value })}
          >
            <option value="all">Всі ({records.length})</option>
            {responsibleOptions.map(([name, count]) => (
              <option key={name} value={name}>
                {name} ({count})
              </option>
            ))}
          </select>
          {filters.responsible !== 'all' && (
            <button
              type="button"
              className="pill-clear-btn"
              aria-label="Очистити фільтр відповідального"
              onClick={() => onUpdateFilters({ responsible: 'all' })}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Search Input matching Screenshot 1 & 3 */}
        <div className="dark-search-box">
          <Search size={15} className="text-orange" aria-hidden="true" />
          <input
            type="search"
            aria-label="Пошук за Імʼя ПЕОМ, Інв.н., Підрозділ"
            className="dark-search-box__input"
            placeholder="Пошук за Імʼя ПЕОМ, Інв.н., Підрозділ..."
            value={filters.searchQuery}
            onChange={(e) => onUpdateFilters({ searchQuery: e.target.value })}
          />
          {filters.searchQuery && (
            <button
              type="button"
              className="pill-clear-btn"
              aria-label="Очистити пошук"
              onClick={() => onUpdateFilters({ searchQuery: '' })}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* ID Sort Segmented Control matching Screenshot 1 */}
        <div className="sort-pill-box" role="group" aria-label="Сортування за ID">
          <span className="sort-pill-box__label">
            <ArrowUpDown size={13} className="text-orange" />
            <span>ID:</span>
          </span>
          <button
            type="button"
            className={`sort-pill-btn ${
              filters.sortDirection === 'desc' ? 'sort-pill-btn--active' : ''
            }`}
            onClick={() => onUpdateFilters({ sortDirection: 'desc' })}
          >
            Спадання (↓)
          </button>
          <button
            type="button"
            className={`sort-pill-btn ${
              filters.sortDirection === 'asc' ? 'sort-pill-btn--active' : ''
            }`}
            onClick={() => onUpdateFilters({ sortDirection: 'asc' })}
          >
            Зростання (↑)
          </button>
        </div>

        {/* Utility Actions & Counter */}
        <div className="dark-toolbar__right">
          {hasActiveFilters && (
            <button type="button" className="btn-header-ghost" onClick={onResetFilters}>
              <RotateCcw size={13} />
              <span>Скинути</span>
            </button>
          )}
          <button type="button" className="btn-header-ghost" onClick={onExportCsv}>
            <Download size={13} />
            <span>Експорт CSV</span>
          </button>
          <span className="found-counter" data-testid="found-counter">
            Знайдено: {filteredCount} з {records.length}
          </span>
        </div>
      </div>
    </section>
  )
}
