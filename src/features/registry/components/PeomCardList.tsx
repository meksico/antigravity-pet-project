import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  CopyPlus,
  Laptop,
  MapPin,
  Pencil,
  Phone,
  Send,
  Trash2,
  User,
  Wifi,
} from 'lucide-react'
import { useState } from 'react'
import type { LaptopRecord } from '../../../schemas/laptopRecordSchema'
import { formatDisplayDateTime } from '../../../services/converters/dateConverter'

interface PeomCardListProps {
  records: readonly LaptopRecord[]
  onOpenChecklist: (record: LaptopRecord) => void
  onOpenHandover: (record: LaptopRecord) => void
  onEditCard: (record: LaptopRecord) => void
  onDuplicateCard: (record: LaptopRecord) => void
  onDeleteCard: (recordId: number) => void
  onCopyCardToClipboard: (record: LaptopRecord) => void
}

export function PeomCardList({
  records,
  onOpenChecklist,
  onOpenHandover,
  onEditCard,
  onDuplicateCard,
  onDeleteCard,
  onCopyCardToClipboard,
}: PeomCardListProps) {
  const [expandedIds, setExpandedIds] = useState<readonly number[]>([])

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  return (
    <section className="cards-pane" aria-label="Картки обліку ПЕОМ">
      <div className="pane-header">
        <h2 className="pane-header__title">
          <span className="pane-header__icon pane-header__icon--blue" aria-hidden="true">
            ⊞
          </span>
          <span>Картки ({records.length})</span>
        </h2>
        <span className="pane-header__hint">Редагування оновлює таблицю</span>
      </div>

      {records.length === 0 ? (
        <div className="empty-card-state">
          Записів за вказаними критеріями пошуку не знайдено.
        </div>
      ) : (
        <div className="peom-cards-stack">
          {records.map((record, index) => {
            const isExpanded = expandedIds.includes(record.id)
            return (
              <article
                key={record.id}
                className={`peom-card ${index === 0 ? 'peom-card--featured' : ''}`}
              >
                {/* Top Strip */}
                <div className="peom-card__top">
                  <div className="peom-card__badges">
                    <span className="id-pill">ID #{record.id}</span>
                    <span className="inv-pill">Инв.н.: {record.inventoryNumber}</span>
                    <span className="subdivision-pill">{record.subdivision}</span>
                    {record.isCompleted ? (
                      <span className="status-pill status-pill--issued">
                        <CheckCircle2 size={13} />
                        <span>Видано</span>
                      </span>
                    ) : (
                      <span className="status-pill status-pill--active">
                        <Clock size={13} />
                        <span>Активні</span>
                      </span>
                    )}
                    <span className="location-pill">
                      <MapPin size={13} />
                      <span>{record.location}</span>
                    </span>
                  </div>

                  <div className="peom-card__icon-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      title="Копіювати інформацію картки в буфер обміну"
                      aria-label={`Копіювати інформацію картки ${record.hostname || `#${record.id}`}`}
                      onClick={() => onCopyCardToClipboard(record)}
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Редагувати картку"
                      aria-label={`Редагувати картку ${record.hostname || `#${record.id}`}`}
                      onClick={() => onEditCard(record)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--danger"
                      title="Видалити картку"
                      aria-label={`Видалити картку ${record.hostname || `#${record.id}`}`}
                      onClick={() => onDeleteCard(record.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* 2-Column Intake & Responsible Summary */}
                <div className="peom-card__summary-grid">
                  <div className="summary-box summary-box--neutral">
                    <span className="summary-box__label">ДАТА/ЧАС ПРИЙНЯТТЯ</span>
                    <strong className="summary-box__value">
                      {formatDisplayDateTime(record.receivedAt)}
                    </strong>
                    <span className="summary-box__hostname">{record.hostname || '—'}</span>
                  </div>

                  <div className="summary-box summary-box--blue">
                    <span className="summary-box__label summary-box__label--blue">
                      <User size={12} />
                      <span>ВІДПОВІДАЛЬНИЙ</span>
                    </span>
                    <strong className="summary-box__value">{record.responsibleName}</strong>
                    <div className="summary-box__meta">
                      <span>{record.responsibleRank}</span>
                      {record.responsiblePhone && (
                        <a href={`tel:${record.responsiblePhone}`} className="phone-link">
                          <Phone size={11} />
                          <span>{record.responsiblePhone}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Handover Box */}
                <div className="handover-banner">
                  <div className="handover-banner__row">
                    <span className="handover-banner__title">
                      <Calendar size={13} />
                      <span>ДАТА/ЧАС ВИДАЧІ:</span>
                    </span>
                    {record.issuedAt ? (
                      <strong className="handover-banner__date">
                        {formatDisplayDateTime(record.issuedAt)}
                      </strong>
                    ) : (
                      <button
                        type="button"
                        className="btn-handover-inline"
                        aria-label={`Видати ${record.hostname || `#${record.id}`}`}
                        onClick={() => onOpenHandover(record)}
                      >
                        <Send size={12} />
                        <span>Видати ПЕОМ</span>
                      </button>
                    )}
                  </div>
                  {record.issuedToName && (
                    <div className="handover-banner__row handover-banner__row--sub">
                      <span className="handover-banner__recipient">
                        <User size={12} />
                        <span>{record.issuedToName}</span>
                      </span>
                      {record.issuedToPhone && (
                        <span className="handover-banner__phone">
                          <Phone size={12} />
                          <span>{record.issuedToPhone}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Interactive 27-Step Checklist Bar */}
                <button
                  type="button"
                  className={`checklist-bar ${
                    record.checklistCompleted
                      ? 'checklist-bar--complete'
                      : 'checklist-bar--pending'
                  }`}
                  title="Переглянути або редагувати чек-ліст інсталяції"
                  aria-label={`Чек-ліст для ${record.hostname || `#${record.id}`}`}
                  onClick={() => onOpenChecklist(record)}
                >
                  <span className="checklist-bar__left">
                    <CheckCircle2 size={16} />
                    <span>
                      {record.checklistCompleted
                        ? 'Інстальований на 100%'
                        : 'Чек-ліст інсталяції (очікує виконання)'}
                    </span>
                  </span>
                  <span className="checklist-bar__badge">
                    {record.checklistCompleted ? '27/27' : '0/27'}
                  </span>
                </button>

                {/* Expanded Full Info */}
                {isExpanded ? (
                  <div className="peom-card__details">
                    <div className="peom-card__device-head">
                      <div className="peom-card__device-title">
                        <Laptop size={15} className="text-blue" />
                        <strong>{record.hostname || 'ПЕОМ без назви'}</strong>
                      </div>
                      <div className="peom-card__tag-row">
                        <span className="tag-chip tag-chip--gray">{record.peomDescription}</span>
                        <span className="tag-chip tag-chip--green">
                          <Wifi size={12} />
                          <span>{record.network}</span>
                        </span>
                        <span className="tag-chip tag-chip--blue">
                          <Wifi size={12} />
                          <span>Мережа локальна: {record.localNetwork}</span>
                        </span>
                        <span className="tag-chip tag-chip--purple">{record.asType}</span>
                      </div>
                    </div>

                    <div className="details-meta-grid">
                      <div>
                        <span className="meta-label">WIFI MAC:</span>
                        <span className="meta-value meta-value--mono">
                          {record.wifiMac || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="meta-label">ТИП ОНОВЛЕННЯ:</span>
                        <span className="meta-value">{record.updateType}</span>
                      </div>
                      <div>
                        <span className="meta-label">ГОД:</span>
                        <span className="meta-value">{record.securityClassification}</span>
                      </div>
                      <div>
                        <span className="meta-label">ВІЙСЬКОВА ЧАСТИНА:</span>
                        <span className="meta-value">{record.militaryUnit}</span>
                      </div>
                      <div>
                        <span className="meta-label">ESET PRODUCTINSTANCEID:</span>
                        <span className="meta-value meta-value--mono">
                          {record.esetInstanceId || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="meta-label">ПОЛІТИКА:</span>
                        <span className="meta-value">{record.policy}</span>
                      </div>
                      <div className="details-meta-grid__full">
                        <span className="meta-label">НСЗІ ФІО:</span>
                        <span className="meta-value">
                          {record.infosecRank} {record.infosecName}{' '}
                          {record.infosecPhone ? `(${record.infosecPhone})` : ''}
                        </span>
                      </div>
                      <div className="details-meta-grid__full">
                        <span className="meta-label">CREATEDBY:</span>
                        <span className="meta-value meta-value--mono">
                          {record.createdBy || '—'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="expand-toggle-btn expand-toggle-btn--outlined"
                      onClick={() => toggleExpand(record.id)}
                    >
                      <span>Згорнути подробиці</span>
                      <ChevronUp size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="expand-toggle-btn"
                    onClick={() => toggleExpand(record.id)}
                  >
                    <span>Розгорнути повну інформацію</span>
                    <ChevronDown size={14} />
                  </button>
                )}

                {/* Card Footer */}
                <div className="peom-card__footer">
                  <div className="peom-card__footer-left">
                    <span className="row-ref">Рядок #{record.rowIndex}</span>
                    <button
                      type="button"
                      className="footer-link-btn"
                      title="Створити копію картки з наступним доступним ID"
                      aria-label={`Створити копію картки ${record.hostname || `#${record.id}`}`}
                      onClick={() => onDuplicateCard(record)}
                    >
                      <CopyPlus size={14} />
                      <span>Створити копію картки</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    className="footer-edit-btn"
                    onClick={() => onEditCard(record)}
                  >
                    <Pencil size={13} />
                    <span>Редагувати</span>
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

