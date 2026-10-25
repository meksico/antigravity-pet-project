import { CheckCircle2, ClipboardCheck, Clock, Laptop } from 'lucide-react'
import { memo } from 'react'
import type { LaptopRecord } from '../../../schemas/laptopRecordSchema'

interface RegistryKpiBarProps {
  records: readonly LaptopRecord[]
}

export const RegistryKpiBar = memo(function RegistryKpiBar({ records }: RegistryKpiBarProps) {
  const totalCount = records.length
  const completedCount = records.filter((r) => r.isCompleted).length
  const inProgressCount = totalCount - completedCount
  const checklistReadyCount = records.filter((r) => r.checklistCompleted).length

  return (
    <section className="kpi-grid" aria-label="Ключові показники обліку ПЕОМ">
      <article className="kpi-card">
        <div className="kpi-card__icon kpi-card__icon--primary" aria-hidden="true">
          <Laptop size={20} />
        </div>
        <div>
          <p className="kpi-card__label">Всього опрацьовано</p>
          <p className="kpi-card__value" data-testid="kpi-total">
            {totalCount}
          </p>
        </div>
      </article>

      <article className="kpi-card">
        <div className="kpi-card__icon kpi-card__icon--success" aria-hidden="true">
          <CheckCircle2 size={20} />
        </div>
        <div>
          <p className="kpi-card__label">Видано (_isCompleted)</p>
          <p className="kpi-card__value" data-testid="kpi-completed">
            {completedCount}
          </p>
        </div>
      </article>

      <article className="kpi-card">
        <div className="kpi-card__icon kpi-card__icon--warning" aria-hidden="true">
          <Clock size={20} />
        </div>
        <div>
          <p className="kpi-card__label">В роботі (очікують видачі)</p>
          <p className="kpi-card__value" data-testid="kpi-in-progress">
            {inProgressCount}
          </p>
        </div>
      </article>

      <article className="kpi-card">
        <div className="kpi-card__icon kpi-card__icon--info" aria-hidden="true">
          <ClipboardCheck size={20} />
        </div>
        <div>
          <p className="kpi-card__label">Чек-ліст пройдено (27/27)</p>
          <p className="kpi-card__value" data-testid="kpi-checklist-ready">
            {checklistReadyCount}
          </p>
        </div>
      </article>
    </section>
  )
})

