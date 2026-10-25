import { X } from 'lucide-react'
import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react'
import {
  intakeFormSchema,
  type LaptopRecord,
  type ReferenceDictionaries,
} from '../../../schemas/laptopRecordSchema'
import type { OperatorPresets } from '../../auth/context/AuthContext'

interface IntakeModalProps {
  isOpen: boolean
  dictionaries: ReferenceDictionaries
  presets: OperatorPresets
  operatorEmail: string
  onClose: () => void
  onSubmitIntake: (draft: Omit<LaptopRecord, 'rowIndex' | 'id' | 'isCompleted'>) => void
}

interface IntakeDraftFormState {
  receivedAt: string
  subdivision: string
  location: string
  peomDescription: string
  network: string
  updateType: string
  securityClassification: string
  inventoryNumber: string
  asType: string
  responsibleName: string
  responsibleRank: string
  responsiblePhone: string
  hostname: string
  wifiMac: string
  esetInstanceId: string
  militaryUnit: string
  infosecRank: string
  infosecName: string
  infosecPhone: string
  policy: string
  localNetwork: string
}

export function IntakeModal({
  isOpen,
  dictionaries,
  presets,
  operatorEmail,
  onClose,
  onSubmitIntake,
}: IntakeModalProps) {
  const [form, setForm] = useState<IntakeDraftFormState>(() => ({
    receivedAt: new Date().toISOString().slice(0, 16),
    subdivision: dictionaries.subdivisions[0] ?? 'ЦРЦТіЦ',
    location: presets.defaultLocation || dictionaries.locations[0] || 'ППД',
    peomDescription: dictionaries.peomDescriptions[0] ?? 'Робочий',
    network: dictionaries.networks[1] ?? 'Інтернет',
    updateType: dictionaries.updateTypes[0] ?? 'Автоматично (Інтернет)',
    securityClassification: dictionaries.securityClassifications[2] ?? 'НТ',
    inventoryNumber: '',
    asType: dictionaries.asTypes[1] ?? 'ІСД-І',
    responsibleName: '',
    responsibleRank: '',
    responsiblePhone: '',
    hostname: '',
    wifiMac: '',
    esetInstanceId: '',
    militaryUnit: presets.militaryUnit,
    infosecRank: presets.infosecRank,
    infosecName: presets.infosecName,
    infosecPhone: presets.infosecPhone,
    policy: dictionaries.policies[3] ?? 'AC-3 Light (тільки парольна політика)',
    localNetwork: 'ІСД-Інтернет',
  }))
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  const handleFieldChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)

    const parsedDate = new Date(form.receivedAt)
    const isoReceivedAt = Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toISOString()

    const parsed = intakeFormSchema.safeParse({
      ...form,
      receivedAt: isoReceivedAt,
      checklistCompleted: false,
      createdBy: operatorEmail,
    })

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? 'Перевірте коректність заповнення полів')
      return
    }

    onSubmitIntake({
      ...parsed.data,
      issuedAt: null,
      issuedToName: null,
      issuedToPhone: null,
    })
    onClose()
  }

  return (
    <div className="modal-backdrop">
      <div
        className="modal-panel modal-panel--lg"
        role="dialog"
        aria-modal="true"
        aria-label="Прийом нового лептопа"
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Прийом нового лептопа в опрацювання</h2>
            <p className="modal-subtitle">
              Автоматичне присвоєння ID (MAX + 1), нормалізація MAC / Інв.н. та аудит оператора (
              {operatorEmail})
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

          <div className="form-grid-3">
            <div className="form-field">
              <label htmlFor="intake-inventory">Інвентарний номер *</label>
              <input
                id="intake-inventory"
                name="inventoryNumber"
                type="text"
                className="input"
                placeholder="напр. 88"
                value={form.inventoryNumber}
                onChange={handleFieldChange}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="intake-hostname">Імʼя ПЕОМ *</label>
              <input
                id="intake-hostname"
                name="hostname"
                type="text"
                className="input"
                placeholder="DESKTOP-XXXXXXX"
                value={form.hostname}
                onChange={handleFieldChange}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="intake-mac">WiFi MAC</label>
              <input
                id="intake-mac"
                name="wifiMac"
                type="text"
                className="input"
                placeholder="AA:BB:CC:11:22:33"
                value={form.wifiMac}
                onChange={handleFieldChange}
              />
            </div>

            <div className="form-field">
              <label htmlFor="intake-eset">ESET ProductInstanceID</label>
              <input
                id="intake-eset"
                name="esetInstanceId"
                type="text"
                className="input"
                placeholder="UUID (необовʼязково при прийомі)"
                value={form.esetInstanceId}
                onChange={handleFieldChange}
              />
            </div>

            <div className="form-field">
              <label htmlFor="intake-received">Дата/час прийняття</label>
              <input
                id="intake-received"
                name="receivedAt"
                type="datetime-local"
                className="input"
                value={form.receivedAt}
                onChange={handleFieldChange}
              />
            </div>

            <div className="form-field">
              <label htmlFor="intake-subdivision">Підрозділ</label>
              <select
                id="intake-subdivision"
                name="subdivision"
                className="select"
                value={form.subdivision}
                onChange={handleFieldChange}
              >
                {dictionaries.subdivisions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="intake-location">Місцезнаходження</label>
              <select
                id="intake-location"
                name="location"
                className="select"
                value={form.location}
                onChange={handleFieldChange}
              >
                {dictionaries.locations.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="intake-peom-desc">Опис ПЕОМ</label>
              <select
                id="intake-peom-desc"
                name="peomDescription"
                className="select"
                value={form.peomDescription}
                onChange={handleFieldChange}
              >
                {dictionaries.peomDescriptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="intake-network">Мережа</label>
              <select
                id="intake-network"
                name="network"
                className="select"
                value={form.network}
                onChange={handleFieldChange}
              >
                {dictionaries.networks.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="intake-update-type">Тип оновлення</label>
              <select
                id="intake-update-type"
                name="updateType"
                className="select"
                value={form.updateType}
                onChange={handleFieldChange}
              >
                {dictionaries.updateTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="intake-classification">ГОД</label>
              <select
                id="intake-classification"
                name="securityClassification"
                className="select"
                value={form.securityClassification}
                onChange={handleFieldChange}
              >
                {dictionaries.securityClassifications.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="intake-as-type">Тип АС</label>
              <select
                id="intake-as-type"
                name="asType"
                className="select"
                value={form.asType}
                onChange={handleFieldChange}
              >
                {dictionaries.asTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="intake-resp-name">ПІБ відповідального *</label>
              <input
                id="intake-resp-name"
                name="responsibleName"
                type="text"
                className="input"
                placeholder="Прізвище Імʼя По батькові"
                value={form.responsibleName}
                onChange={handleFieldChange}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="intake-resp-rank">Звання відповідального *</label>
              <input
                id="intake-resp-rank"
                name="responsibleRank"
                type="text"
                className="input"
                placeholder="напр. сержант"
                value={form.responsibleRank}
                onChange={handleFieldChange}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="intake-resp-phone">Тел. відповідального</label>
              <input
                id="intake-resp-phone"
                name="responsiblePhone"
                type="text"
                className="input"
                placeholder="0991234567"
                value={form.responsiblePhone}
                onChange={handleFieldChange}
              />
            </div>

            <div className="form-field">
              <label htmlFor="intake-policy">Політика</label>
              <select
                id="intake-policy"
                name="policy"
                className="select"
                value={form.policy}
                onChange={handleFieldChange}
              >
                {dictionaries.policies.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="intake-local-net">Мережа локальна</label>
              <input
                id="intake-local-net"
                name="localNetwork"
                type="text"
                className="input"
                value={form.localNetwork}
                onChange={handleFieldChange}
              />
            </div>

            <div className="form-field">
              <label htmlFor="intake-unit">Військова частина</label>
              <input
                id="intake-unit"
                name="militaryUnit"
                type="text"
                className="input"
                value={form.militaryUnit}
                onChange={handleFieldChange}
              />
            </div>

            <div className="form-field">
              <label htmlFor="intake-infosec-rank">НСЗІ звання</label>
              <input
                id="intake-infosec-rank"
                name="infosecRank"
                type="text"
                className="input"
                value={form.infosecRank}
                onChange={handleFieldChange}
              />
            </div>

            <div className="form-field">
              <label htmlFor="intake-infosec-name">НСЗІ ФІО</label>
              <input
                id="intake-infosec-name"
                name="infosecName"
                type="text"
                className="input"
                value={form.infosecName}
                onChange={handleFieldChange}
              />
            </div>

            <div className="form-field">
              <label htmlFor="intake-infosec-phone">НСЗІ тел</label>
              <input
                id="intake-infosec-phone"
                name="infosecPhone"
                type="text"
                className="input"
                value={form.infosecPhone}
                onChange={handleFieldChange}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Скасувати
            </button>
            <button type="submit" className="btn btn--primary">
              Зберегти запис
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

