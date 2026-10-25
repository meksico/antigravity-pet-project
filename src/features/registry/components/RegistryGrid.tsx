import { CheckCircle2, ClipboardList, Clock, Send } from 'lucide-react'
import type { LaptopRecord } from '../../../schemas/laptopRecordSchema'
import { formatDisplayDateTime } from '../../../services/converters/dateConverter'
import type { ColumnGroupMode } from './RegistryFilterBar'

interface RegistryGridProps {
  records: readonly LaptopRecord[]
  selectedIds: readonly number[]
  columnGroup: ColumnGroupMode
  onToggleSelectRow: (id: number) => void
  onToggleSelectAll: () => void
  onOpenChecklist: (record: LaptopRecord) => void
  onOpenHandover: (record: LaptopRecord) => void
}

export function RegistryGrid({
  records,
  selectedIds,
  columnGroup,
  onToggleSelectRow,
  onToggleSelectAll,
  onOpenChecklist,
  onOpenHandover,
}: RegistryGridProps) {
  const allSelected = records.length > 0 && records.every((r) => selectedIds.includes(r.id))
  const showAll = columnGroup === 'all'
  const showSecurity = columnGroup === 'all' || columnGroup === 'security' || columnGroup === 'compact'
  const showCustodians =
    columnGroup === 'all' || columnGroup === 'custodians' || columnGroup === 'compact'

  return (
    <div className="table-container">
      <table className="registry-table">
        <thead>
          <tr>
            <th className="col-checkbox">
              <input
                type="checkbox"
                aria-label="Вибрати всі відфільтровані"
                checked={allSelected}
                onChange={onToggleSelectAll}
              />
            </th>
            <th>ID (A)</th>
            <th>Статус (F)</th>
            <th>Інв.н. (M)</th>
            <th>Імʼя ПЕОМ (R)</th>
            <th>Підрозділ (G)</th>
            {showAll && <th>Місцезнаходження (H)</th>}
            {showAll && <th>Опис ПЕОМ (I)</th>}
            {showSecurity && <th>Мережа (J)</th>}
            {showAll && <th>Тип оновлення (K)</th>}
            {showSecurity && <th>ГОД (L)</th>}
            {showSecurity && <th>Тип АС (N)</th>}
            {showSecurity && <th>WiFi MAC (S)</th>}
            {showSecurity && <th>ESET Instance ID (T)</th>}
            {showSecurity && <th>Політика (Y)</th>}
            {showAll && <th>Мережа локальна (Z)</th>}
            {showCustodians && <th>Відповідальний (O..Q)</th>}
            {showAll && <th>Військова частина (U)</th>}
            {showAll && <th>НСЗІ (V..X)</th>}
            <th>Прийнято (B)</th>
            {showCustodians && <th>Видано (C..E)</th>}
            <th>Чек-ліст (AA)</th>
            {showAll && <th>CreatedBy (AB)</th>}
            <th className="col-actions">Дії</th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr>
              <td colSpan={24} className="registry-table__empty">
                Записів за вказаними критеріями пошуку не знайдено.
              </td>
            </tr>
          ) : (
            records.map((record) => {
              const isSelected = selectedIds.includes(record.id)
              return (
                <tr key={record.id} className={isSelected ? 'row--selected' : undefined}>
                  <td className="col-checkbox">
                    <input
                      type="checkbox"
                      aria-label={`Вибрати ${record.hostname}`}
                      checked={isSelected}
                      onChange={() => onToggleSelectRow(record.id)}
                    />
                  </td>
                  <td className="cell-mono">#{record.id}</td>
                  <td>
                    {record.isCompleted ? (
                      <span className="badge badge--success">
                        <CheckCircle2 size={12} />
                        <span>Видано</span>
                      </span>
                    ) : (
                      <span className="badge badge--warning">
                        <Clock size={12} />
                        <span>В роботі</span>
                      </span>
                    )}
                  </td>
                  <td className="cell-mono">{record.inventoryNumber}</td>
                  <td className="cell-mono cell-strong">{record.hostname}</td>
                  <td>{record.subdivision}</td>
                  {showAll && <td>{record.location}</td>}
                  {showAll && <td>{record.peomDescription}</td>}
                  {showSecurity && <td>{record.network}</td>}
                  {showAll && <td>{record.updateType}</td>}
                  {showSecurity && (
                    <td>
                      <span className="badge badge--neutral">{record.securityClassification}</span>
                    </td>
                  )}
                  {showSecurity && <td>{record.asType}</td>}
                  {showSecurity && <td className="cell-mono">{record.wifiMac || '—'}</td>}
                  {showSecurity && (
                    <td className="cell-mono cell-truncate" title={record.esetInstanceId}>
                      {record.esetInstanceId || '—'}
                    </td>
                  )}
                  {showSecurity && (
                    <td className="cell-truncate" title={record.policy}>
                      {record.policy}
                    </td>
                  )}
                  {showAll && <td>{record.localNetwork}</td>}
                  {showCustodians && (
                    <td>
                      <div className="cell-stack">
                        <span className="cell-stack__primary">{record.responsibleName}</span>
                        <span className="cell-stack__secondary">
                          {record.responsibleRank} • {record.responsiblePhone || 'без тел.'}
                        </span>
                      </div>
                    </td>
                  )}
                  {showAll && <td className="cell-mono">{record.militaryUnit}</td>}
                  {showAll && (
                    <td>
                      <div className="cell-stack">
                        <span className="cell-stack__primary">{record.infosecName}</span>
                        <span className="cell-stack__secondary">
                          {record.infosecRank} • {record.infosecPhone}
                        </span>
                      </div>
                    </td>
                  )}
                  <td className="cell-nowrap">{formatDisplayDateTime(record.receivedAt)}</td>
                  {showCustodians && (
                    <td>
                      {record.issuedAt ? (
                        <div className="cell-stack">
                          <span className="cell-stack__primary">{record.issuedToName}</span>
                          <span className="cell-stack__secondary">
                            {formatDisplayDateTime(record.issuedAt)} • {record.issuedToPhone}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted">Ще не видано</span>
                      )}
                    </td>
                  )}
                  <td>
                    <button
                      type="button"
                      className={`btn btn--sm ${record.checklistCompleted ? 'btn--success-soft' : 'btn--warning-soft'}`}
                      aria-label={`Чек-ліст для ${record.hostname}`}
                      onClick={() => onOpenChecklist(record)}
                    >
                      <ClipboardList size={14} />
                      <span>{record.checklistCompleted ? '27/27 Готово' : 'Чек-ліст'}</span>
                    </button>
                  </td>
                  {showAll && <td className="cell-mono">{record.createdBy}</td>}
                  <td className="col-actions">
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      aria-label={`Видати ${record.hostname}`}
                      onClick={() => onOpenHandover(record)}
                    >
                      <Send size={13} />
                      <span>{record.isCompleted ? 'Оновити видачу' : 'Видати'}</span>
                    </button>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
