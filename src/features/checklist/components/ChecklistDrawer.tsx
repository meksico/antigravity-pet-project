import { Check, CheckCircle2, ListChecks, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ChecklistStepItem, LaptopRecord } from '../../../schemas/laptopRecordSchema'

interface ChecklistDrawerProps {
  record: LaptopRecord | null
  steps: readonly ChecklistStepItem[]
  onClose: () => void
  onConfirmChecklist: (recordId: number, completed: boolean) => void
}

export function ChecklistDrawer({
  record,
  steps,
  onClose,
  onConfirmChecklist,
}: ChecklistDrawerProps) {
  const [checkedNumbers, setCheckedNumbers] = useState<readonly number[]>(() =>
    record?.checklistCompleted ? steps.map((s) => s.stepNumber) : [],
  )

  useEffect(() => {
    if (!record) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [record, onClose])

  if (!record) {
    return null
  }

  const totalCount = steps.length
  const completedCount = checkedNumbers.length
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const isAllChecked = completedCount === totalCount && totalCount > 0

  const toggleStep = (stepNumber: number) => {
    setCheckedNumbers((prev) =>
      prev.includes(stepNumber)
        ? prev.filter((num) => num !== stepNumber)
        : [...prev, stepNumber],
    )
  }

  const markAllSteps = () => {
    setCheckedNumbers(steps.map((s) => s.stepNumber))
  }

  const clearAllSteps = () => {
    setCheckedNumbers([])
  }

  const handleConfirm = () => {
    onConfirmChecklist(record.id, isAllChecked)
    onClose()
  }

  return (
    <div className="modal-backdrop">
      <div
        className="checklist-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Перевірка інсталяції"
      >
        {/* Dark Header matching Pasted 25-10-2026 at 20.10.01.png */}
        <div className="checklist-modal__header">
          <div className="checklist-modal__brand">
            <div className="checklist-modal__icon-box" aria-hidden="true">
              <ListChecks size={22} />
            </div>
            <div>
              <div className="checklist-modal__title-row">
                <h2 className="checklist-modal__title">Перевірка інсталяції</h2>
                <span className="checklist-modal__id-pill">ID #{record.id}</span>
              </div>
              <p className="checklist-modal__subtitle">
                ПЕОМ: «{record.hostname || '—'}» • Відповідальний: «{record.responsibleName || '—'}»
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-close-dark"
            aria-label="Закрити"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* Subheader Progress & Bulk Actions Bar */}
        <div className="checklist-modal__subbar">
          <div className="checklist-modal__progress-col">
            <div className="checklist-modal__progress-top">
              <span className="checklist-modal__progress-label">
                Прогрес перевірки:{' '}
                <strong
                  className={isAllChecked ? 'text-emerald' : 'text-amber'}
                  data-testid="checklist-progress"
                >
                  {completedCount} з {totalCount} ({percent}%)
                </strong>
              </span>

              {isAllChecked && (
                <span className="checklist-ready-pill">
                  <CheckCircle2 size={13} />
                  <span>Готово до 100%</span>
                </span>
              )}
            </div>

            <div className="checklist-progress-track" aria-hidden="true">
              <div
                className={`checklist-progress-fill ${
                  isAllChecked ? 'checklist-progress-fill--complete' : ''
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <div className="checklist-modal__bulk-btns">
            <button
              type="button"
              className="btn-checklist-outline btn-checklist-outline--blue"
              onClick={markAllSteps}
            >
              Обрати всі
            </button>
            <button
              type="button"
              className="btn-checklist-outline"
              onClick={clearAllSteps}
            >
              Скинути
            </button>
          </div>
        </div>

        {/* Flat 27-Step Scrollable Pill List */}
        <div className="checklist-modal__body">
          <ul className="checklist-pills-list">
            {steps.map((step) => {
              const isChecked = checkedNumbers.includes(step.stepNumber)
              return (
                <li key={step.stepNumber}>
                  <label
                    className={`checklist-pill-row ${
                      isChecked ? 'checklist-pill-row--checked' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="checklist-pill-row__checkbox"
                      checked={isChecked}
                      onChange={() => toggleStep(step.stepNumber)}
                    />
                    <span className="checklist-pill-row__num">#{step.stepNumber}</span>
                    <span className="checklist-pill-row__title">{step.title}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Footer matching Pasted 25-10-2026 at 20.10.01.png */}
        <div className="checklist-modal__footer">
          <div className="checklist-modal__status-note">
            <CheckCircle2
              size={16}
              className={isAllChecked ? 'text-emerald' : 'text-muted'}
              aria-hidden="true"
            />
            <span className={isAllChecked ? 'text-emerald-dark' : 'text-muted'}>
              {isAllChecked
                ? 'Всі пункти відмічено: після збереження статус зміниться на «Інстальований на 100%»'
                : `Відмічено ${completedCount} з ${totalCount} пунктів чек-ліста інсталяції`}
            </span>
          </div>

          <div className="checklist-modal__footer-actions">
            <button
              type="button"
              className="btn-checklist-cancel"
              onClick={onClose}
            >
              Скасувати
            </button>
            <button
              type="button"
              className="btn-checklist-save"
              onClick={handleConfirm}
            >
              <Check size={16} />
              <span>
                {isAllChecked
                  ? 'Зберегти (Інстальований на 100%)'
                  : `Зберегти (${completedCount}/${totalCount})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
