import { CheckCircle2, ClipboardList, Clock, Copy, Pencil, Send, Trash2 } from 'lucide-react'
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
  onEditCard: (record: LaptopRecord) => void
  onDeleteCard: (recordId: number) => void
  onCopyCardToClipboard: (record: LaptopRecord) => void
}

export function RegistryGrid({
  records,
  selectedIds,
  onToggleSelectRow,
  onToggleSelectAll,
  onOpenChecklist,
  onOpenHandover,
  onEditCard,
  onDeleteCard,
  onCopyCardToClipboard,
}: RegistryGridProps) {
  const allSelected = records.length > 0 && records.every((r) => selectedIds.includes(r.id))

  return (
    <section className="table-pane" aria-label="Таблиця даних обліку ПЕОМ">
      <div className="table-pane__header">
        <h2 className="pane-header__title">
          <span className="pane-header__icon pane-header__icon--orange" aria-hidden="true">
            ▤
          </span>
          <span>Таблиця даних ({records.length} рядків)</span>
        </h2>

        <span className="sync-active-badge">
          <span className="sync-dot" aria-hidden="true" />
          <span>Синхронізація активна</span>
        </span>
      </div>

      <div className="table-scroll-container">
        <table className="registry-table">
          <thead>
            <tr>
              <th className="col-actions-left">
                <div className="th-actions-wrap">
                  <input
                    type="checkbox"
                    aria-label="Вибрати всі відфільтровані"
                    checked={allSelected}
                    onChange={onToggleSelectAll}
                  />
                  <span>ДІЇ</span>
                </div>
              </th>
              <th className="col-id">ID</th>
              <th>ДАТА/ЧАС ПРИЙНЯТТЯ</th>
              <th>ДАТА/ЧАС ВИДАЧІ</th>
              <th>ВИДАНО ФІО</th>
              <th>ВИДАНО ТЕЛ.</th>
              <th>_ISCOMPLETED</th>
              <th>ПІДРОЗДІЛ</th>
              <th>МІСЦЕЗНАХОДЖЕННЯ</th>
              <th>ОПИС ПЕОМ</th>
              <th>МЕРЕЖА</th>
              <th>ТИП ОНОВЛЕННЯ</th>
              <th>ГОД</th>
              <th>ИНВ.Н.</th>
              <th>ТИП АС</th>
              <th>ВІДПОВІДАЛЬНИЙ</th>
              <th>ЗВАННЯ</th>
              <th>ТЕЛ. ВІДПОВІДАЛЬНОГО</th>
              <th>ІМʼЯ ПЕОМ</th>
              <th>WIFI MAC</th>
              <th>ESET PRODUCTINSTANCEID</th>
              <th>ВІЙСЬКОВА ЧАСТИНА</th>
              <th>НСЗІ ЗВАННЯ</th>
              <th>НСЗІ ФІО</th>
              <th>НСЗІ ТЕЛ</th>
              <th>ПОЛІТИКА</th>
              <th>МЕРЕЖА ЛОКАЛЬНА</th>
              <th>ЧЕК-ЛІСТ (AA)</th>
              <th>CREATEDBY</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={29} className="registry-table__empty">
                  Записів за вказаними критеріями пошуку не знайдено.
                </td>
              </tr>
            ) : (
              records.map((record) => {
                const isSelected = selectedIds.includes(record.id)
                return (
                  <tr key={record.id} className={isSelected ? 'row--selected' : undefined}>
                    <td className="col-actions-left">
                      <div className="row-actions-group">
                        <input
                          type="checkbox"
                          aria-label={`Вибрати ${record.hostname}`}
                          checked={isSelected}
                          onChange={() => onToggleSelectRow(record.id)}
                        />
                        <button
                          type="button"
                          className="table-icon-btn"
                          title="Копіювати в буфер обміну"
                          onClick={() => onCopyCardToClipboard(record)}
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          type="button"
                          className="table-icon-btn"
                          title="Редагувати картку"
                          onClick={() => onEditCard(record)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="table-icon-btn table-icon-btn--danger"
                          title="Видалити картку"
                          onClick={() => onDeleteCard(record.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="col-id cell-strong">{record.id}</td>
                    <td className="cell-mono cell-nowrap">{record.receivedAt.slice(0, 19)}</td>
                    <td className="cell-mono cell-nowrap">
                      {record.issuedAt ? record.issuedAt.slice(0, 19) : '—'}
                    </td>
                    <td className="cell-nowrap">{record.issuedToName || '—'}</td>
                    <td className="cell-mono cell-nowrap">{record.issuedToPhone || '—'}</td>
                    <td>
                      {record.isCompleted ? (
                        <span className="status-pill status-pill--issued">
                          <CheckCircle2 size={12} />
                          <span>Видано</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn-handover-inline"
                          aria-label={`Видати ${record.hostname || `#${record.id}`}`}
                          onClick={() => onOpenHandover(record)}
                        >
                          <Clock size={12} />
                          <span>В роботі</span>
                          <Send size={11} />
                        </button>
                      )}
                    </td>
                    <td className="cell-nowrap">{record.subdivision}</td>
                    <td className="cell-nowrap">{record.location}</td>
                    <td className="cell-nowrap">{record.peomDescription}</td>
                    <td className="cell-nowrap">{record.network}</td>
                    <td className="cell-nowrap">{record.updateType}</td>
                    <td className="cell-nowrap">{record.securityClassification}</td>
                    <td className="cell-mono">{record.inventoryNumber || '—'}</td>
                    <td className="cell-nowrap">{record.asType}</td>
                    <td className="cell-nowrap cell-strong">{record.responsibleName}</td>
                    <td className="cell-nowrap">{record.responsibleRank}</td>
                    <td className="cell-mono cell-nowrap">{record.responsiblePhone || '—'}</td>
                    <td className="cell-mono cell-strong">{record.hostname || '—'}</td>
                    <td className="cell-mono cell-nowrap">{record.wifiMac || '—'}</td>
                    <td className="cell-mono cell-truncate" title={record.esetInstanceId}>
                      {record.esetInstanceId || '—'}
                    </td>
                    <td className="cell-mono">{record.militaryUnit}</td>
                    <td className="cell-nowrap">{record.infosecRank}</td>
                    <td className="cell-nowrap">{record.infosecName}</td>
                    <td className="cell-mono cell-nowrap">{record.infosecPhone}</td>
                    <td className="cell-truncate" title={record.policy}>
                      {record.policy}
                    </td>
                    <td className="cell-nowrap">{record.localNetwork}</td>
                    <td>
                      <button
                        type="button"
                        className="table-checklist-btn"
                        aria-label={`Чек-ліст для ${record.hostname}`}
                        onClick={() => onOpenChecklist(record)}
                      >
                        <ClipboardList size={13} />
                        <span>{record.checklistCompleted ? '27/27' : '0/27'}</span>
                      </button>
                    </td>
                    <td className="cell-mono cell-nowrap">
                      {record.createdBy || formatDisplayDateTime(record.receivedAt)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="table-pane__footer">
        Будь-яка зміна картки одразу зберігається та відображається в таблиці
      </div>
    </section>
  )
}
