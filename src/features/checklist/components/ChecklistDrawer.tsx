import { CheckSquare, ShieldAlert, Square, X } from 'lucide-react'
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

  // Group steps by category while preserving order
  const categories = Array.from(new Set(steps.map((s) => s.category)))

  return (
    <div className="modal-backdrop">
      <aside
        className="drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Чек-ліст інсталяції"
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              Чек-ліст інсталяції ПЕОМ: {record.hostname} (ID #{record.id})
            </h2>
            <p className="modal-subtitle">
              Інв.н. {record.inventoryNumber} • Підрозділ: {record.subdivision} • Політика:{' '}
              {record.policy}
            </p>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            aria-label="Закрити"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="drawer-toolbar">
          <div className="drawer-progress">
            <span className="drawer-progress__label">Прогрес виконання (27 кроків):</span>
            <strong data-testid="checklist-progress">
              {completedCount} / {totalCount} ({percent}%)
            </strong>
          </div>
          <div className="drawer-toolbar__actions">
            <button type="button" className="btn btn--secondary btn--sm" onClick={markAllSteps}>
              <CheckSquare size={14} />
              <span>Відмітити всі 27 кроків</span>
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={clearAllSteps}>
              <Square size={14} />
              <span>Очистити</span>
            </button>
          </div>
        </div>

        <div className="drawer-security-banner">
          <ShieldAlert size={16} aria-hidden="true" />
          <span>
            Паролі локальних адміністраторів не зберігаються в таблиці (Аудит безпеки: читається
            виключно стовпець A аркуша «Чек-ліст»).
          </span>
        </div>

        <div className="drawer-body">
          {categories.map((category) => {
            const categorySteps = steps.filter((s) => s.category === category)
            return (
              <div key={category} className="checklist-group">
                <h3 className="checklist-group__title">{category}</h3>
                <ul className="checklist-list">
                  {categorySteps.map((step) => {
                    const isChecked = checkedNumbers.includes(step.stepNumber)
                    return (
                      <li key={step.stepNumber} className="checklist-item">
                        <label className="checklist-item__label">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleStep(step.stepNumber)}
                          />
                          <span className="checklist-item__num">#{step.stepNumber}</span>
                          <span className="checklist-item__text">{step.title}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Закрити
          </button>
          <button type="button" className="btn btn--primary" onClick={handleConfirm}>
            Підтвердити виконання чек-ліста
          </button>
        </div>
      </aside>
    </div>
  )
}

