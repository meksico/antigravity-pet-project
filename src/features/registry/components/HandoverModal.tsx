import { X } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { handoverFormSchema, type LaptopRecord } from '../../../schemas/laptopRecordSchema'

interface HandoverModalProps {
  record: LaptopRecord | null
  onClose: () => void
  onConfirmHandover: (
    recordId: number,
    payload: { issuedAt: string; issuedToName: string; issuedToPhone: string },
  ) => void
}

export function HandoverModal({ record, onClose, onConfirmHandover }: HandoverModalProps) {
  const [issuedToName, setIssuedToName] = useState(record?.responsibleName ?? '')
  const [issuedToPhone, setIssuedToPhone] = useState(record?.responsiblePhone ?? '')
  const [issuedAt, setIssuedAt] = useState(() => new Date().toISOString().slice(0, 16))
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)

    const parsedDate = new Date(issuedAt)
    const isoIssuedAt = Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toISOString()
    const parsed = handoverFormSchema.safeParse({
      issuedAt: isoIssuedAt,
      issuedToName,
      issuedToPhone,
    })

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? 'Перевірте дані отримувача')
      return
    }

    onConfirmHandover(record.id, parsed.data)
    onClose()
  }

  return (
    <div className="modal-backdrop">
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Видача лептопа"
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              Видача лептопа: {record.hostname} (ID #{record.id})
            </h2>
            <p className="modal-subtitle">
              Заповнює колонки C..E («Дата/час видачі», «Видано ФІО», «Видано тел.»). Колонка F (
              <code>_isCompleted</code>) обчислюється автоматично формулою!
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

        <form onSubmit={handleSubmit} className="modal-body">
          {errorMessage && (
            <div className="alert alert--danger" role="alert">
              {errorMessage}
            </div>
          )}

          {!record.checklistCompleted && (
            <div className="alert alert--warning">
              Увага: Чек-ліст інсталяції (27 кроків) для цього лептопа ще не відмічено як завершений.
            </div>
          )}

          <div className="form-field">
            <label htmlFor="handover-name">Видано ФІО *</label>
            <input
              id="handover-name"
              type="text"
              className="input"
              placeholder="ПІБ отримувача"
              value={issuedToName}
              onChange={(e) => setIssuedToName(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="handover-phone">Видано тел. *</label>
            <input
              id="handover-phone"
              type="text"
              className="input"
              placeholder="0991234567"
              value={issuedToPhone}
              onChange={(e) => setIssuedToPhone(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="handover-date">Дата/час видачі</label>
            <input
              id="handover-date"
              type="datetime-local"
              className="input"
              value={issuedAt}
              onChange={(e) => setIssuedAt(e.target.value)}
              required
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Скасувати
            </button>
            <button type="submit" className="btn btn--primary">
              Підтвердити видачу
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

