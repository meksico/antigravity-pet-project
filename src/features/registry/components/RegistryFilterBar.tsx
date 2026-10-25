import { Download, Plus, RotateCcw, Search } from 'lucide-react'
import type { ReferenceDictionaries } from '../../../schemas/laptopRecordSchema'

export type StatusFilter = 'all' | 'pending' | 'completed'
export type ColumnGroupMode = 'compact' | 'all' | 'security' | 'custodians'

export interface RegistryFiltersState {
  searchQuery: string
  status: StatusFilter
  subdivision: string
  network: string
  asType: string
  securityClassification: string
  columnGroup: ColumnGroupMode
}

interface RegistryFilterBarProps {
  filters: RegistryFiltersState
  dictionaries: ReferenceDictionaries
  onUpdateFilters: (partial: Partial<RegistryFiltersState>) => void
  onResetFilters: () => void
  onOpenIntakeModal: () => void
  onExportCsv: () => void
}

export function RegistryFilterBar({
  filters,
  dictionaries,
  onUpdateFilters,
  onResetFilters,
  onOpenIntakeModal,
  onExportCsv,
}: RegistryFilterBarProps) {
  return (
    <section className="filter-bar" aria-label="Фільтрація та пошук записів">
      <div className="filter-bar__top">
        <div className="filter-bar__search">
          <Search size={16} className="filter-bar__search-icon" aria-hidden="true" />
          <input
            type="search"
            aria-label="Пошук за Імʼям ПЕОМ, MAC, Інв.н., ФІО або ESET ID"
            className="input filter-bar__search-input"
            placeholder="Пошук за Імʼям ПЕОМ, MAC, Інв.н., ФІО або ESET ID..."
            value={filters.searchQuery}
            onChange={(e) => onUpdateFilters({ searchQuery: e.target.value })}
          />
        </div>

        <div className="filter-bar__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onResetFilters}>
            <RotateCcw size={14} />
            <span>Скинути</span>
          </button>
          <button type="button" className="btn btn--secondary btn--sm" onClick={onExportCsv}>
            <Download size={14} />
            <span>Експорт CSV</span>
          </button>
          <button type="button" className="btn btn--primary" onClick={onOpenIntakeModal}>
            <Plus size={16} />
            <span>Додати лептоп</span>
          </button>
        </div>
      </div>

      <div className="filter-bar__selects">
        <div className="filter-item">
          <label htmlFor="filter-status">Статус</label>
          <select
            id="filter-status"
            aria-label="Фільтр статусу"
            className="select select--sm"
            value={filters.status}
            onChange={(e) => onUpdateFilters({ status: e.target.value as StatusFilter })}
          >
            <option value="all">Усі записи</option>
            <option value="pending">В роботі (не видані)</option>
            <option value="completed">Видані (_isCompleted)</option>
          </select>
        </div>

        <div className="filter-item">
          <label htmlFor="filter-subdivision">Підрозділ</label>
          <select
            id="filter-subdivision"
            aria-label="Фільтр підрозділу"
            className="select select--sm"
            value={filters.subdivision}
            onChange={(e) => onUpdateFilters({ subdivision: e.target.value })}
          >
            <option value="all">Усі підрозділи</option>
            {dictionaries.subdivisions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label htmlFor="filter-network">Мережа</label>
          <select
            id="filter-network"
            aria-label="Фільтр мережі"
            className="select select--sm"
            value={filters.network}
            onChange={(e) => onUpdateFilters({ network: e.target.value })}
          >
            <option value="all">Усі мережі</option>
            {dictionaries.networks.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label htmlFor="filter-as-type">Тип АС</label>
          <select
            id="filter-as-type"
            aria-label="Фільтр типу АС"
            className="select select--sm"
            value={filters.asType}
            onChange={(e) => onUpdateFilters({ asType: e.target.value })}
          >
            <option value="all">Усі типи АС</option>
            {dictionaries.asTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label htmlFor="filter-classification">ГОД</label>
          <select
            id="filter-classification"
            aria-label="Фільтр ГОД"
            className="select select--sm"
            value={filters.securityClassification}
            onChange={(e) => onUpdateFilters({ securityClassification: e.target.value })}
          >
            <option value="all">Усі грифи (ГОД)</option>
            {dictionaries.securityClassifications.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label htmlFor="filter-columns">Режим колонок</label>
          <select
            id="filter-columns"
            aria-label="Режим відображення колонок"
            className="select select--sm"
            value={filters.columnGroup}
            onChange={(e) => onUpdateFilters({ columnGroup: e.target.value as ColumnGroupMode })}
          >
            <option value="compact">Основні колонки</option>
            <option value="all">Усі 28 колонок (A..AB)</option>
            <option value="security">ІБ / ESET / Мережа</option>
            <option value="custodians">Відповідальні та Видача</option>
          </select>
        </div>
      </div>
    </section>
  )
}

