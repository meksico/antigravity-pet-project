import { Calendar, Check, Copy, Laptop, Pencil, Plus, Shield, User, X } from 'lucide-react'
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from 'react'
import {
  intakeFormSchema,
  type LaptopRecord,
  type ReferenceDictionaries,
} from '../../../schemas/laptopRecordSchema'
import { normalizePhone } from '../../../services/converters/normalizers'
import type { OperatorPresets } from '../../auth/context/AuthContext'

interface IntakeModalProps {
  isOpen: boolean
  editingRecord: LaptopRecord | null
  nextAutoId: number
  dictionaries: ReferenceDictionaries
  presets: OperatorPresets
  operatorEmail: string
  onClose: () => void
  onSubmitCreate: (draft: Omit<LaptopRecord, 'rowIndex' | 'id' | 'isCompleted'>) => void
  onSubmitEdit: (updated: LaptopRecord) => void
}

interface CardModalFormState {
  receivedAt: string
  issuedAt: string
  issuedToName: string
  issuedToPhone: string
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
  editingRecord,
  nextAutoId,
  dictionaries,
  presets,
  operatorEmail,
  onClose,
  onSubmitCreate,
  onSubmitEdit,
}: IntakeModalProps) {
  const matchCanonicalRank = (rank: string) => {
    if (!rank) return ''
    const match = dictionaries.ranks.find((r) => r.toLowerCase() === rank.toLowerCase())
    return match ?? rank
  }

  const [form, setForm] = useState<CardModalFormState>(() => {
    if (editingRecord) {
      return {
        receivedAt: editingRecord.receivedAt.slice(0, 16),
        issuedAt: editingRecord.issuedAt ? editingRecord.issuedAt.slice(0, 16) : '',
        issuedToName: editingRecord.issuedToName ?? '',
        issuedToPhone: editingRecord.issuedToPhone ?? '',
        subdivision: editingRecord.subdivision,
        location: editingRecord.location,
        peomDescription: editingRecord.peomDescription,
        network: editingRecord.network,
        updateType: editingRecord.updateType,
        securityClassification: editingRecord.securityClassification,
        inventoryNumber: editingRecord.inventoryNumber,
        asType: editingRecord.asType,
        responsibleName: editingRecord.responsibleName,
        responsibleRank: matchCanonicalRank(editingRecord.responsibleRank),
        responsiblePhone: editingRecord.responsiblePhone,
        hostname: editingRecord.hostname,
        wifiMac: editingRecord.wifiMac,
        esetInstanceId: editingRecord.esetInstanceId,
        militaryUnit: editingRecord.militaryUnit,
        infosecRank: matchCanonicalRank(editingRecord.infosecRank),
        infosecName: editingRecord.infosecName,
        infosecPhone: editingRecord.infosecPhone,
        policy: editingRecord.policy,
        localNetwork: editingRecord.localNetwork,
      }
    }

    return {
      receivedAt: new Date().toISOString().slice(0, 16),
      issuedAt: '',
      issuedToName: '',
      issuedToPhone: '',
      subdivision: dictionaries.subdivisions[0] ?? '2МБ',
      location: presets.defaultLocation || dictionaries.locations[0] || 'ППД',
      peomDescription: dictionaries.peomDescriptions[0] ?? 'Робочий',
      network: dictionaries.networks[1] ?? 'Інтернет',
      updateType: dictionaries.updateTypes[0] ?? 'Автоматично (Інтернет)',
      securityClassification: dictionaries.securityClassifications[2] ?? 'НТ',
      inventoryNumber: '',
      asType: dictionaries.asTypes[1] ?? 'ІСД-І',
      responsibleName: '',
      responsibleRank: matchCanonicalRank('Солдат') || dictionaries.ranks[0] || 'Солдат',
      responsiblePhone: '',
      hostname: '',
      wifiMac: '',
      esetInstanceId: '',
      militaryUnit: presets.militaryUnit,
      infosecRank:
        matchCanonicalRank(presets.infosecRank) ||
        matchCanonicalRank('Майор') ||
        dictionaries.ranks[0] ||
        'Майор',
      infosecName: presets.infosecName,
      infosecPhone: presets.infosecPhone,
      policy: dictionaries.policies[3] ?? 'AC-3 Light (тільки парольна політика)',
      localNetwork: 'ІСД-Інтернет',
    }
  })

  const responsibleRankOptions = useMemo(() => {
    const list = [...dictionaries.ranks]
    if (
      form.responsibleRank &&
      !list.some((r) => r.toLowerCase() === form.responsibleRank.toLowerCase())
    ) {
      list.unshift(form.responsibleRank)
    }
    return list
  }, [dictionaries.ranks, form.responsibleRank])

  const infosecRankOptions = useMemo(() => {
    const list = [...dictionaries.ranks]
    if (
      form.infosecRank &&
      !list.some((r) => r.toLowerCase() === form.infosecRank.toLowerCase())
    ) {
      list.unshift(form.infosecRank)
    }
    return list
  }, [dictionaries.ranks, form.infosecRank])

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copiedFeedback, setCopiedFeedback] = useState(false)

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

  const isEditing = Boolean(editingRecord)
  const displayId = editingRecord ? editingRecord.id : nextAutoId
  const dialogLabel = editingRecord
    ? `Редагування картки ID #${editingRecord.id}`
    : 'Прийом нового лептопа'

  const handleFieldChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleCopyModalToClipboard = () => {
    const summary = [
      `ID #${displayId} | Инв.н.: ${form.inventoryNumber} | ${form.hostname}`,
      `Підрозділ: ${form.subdivision} (${form.location})`,
      `Відповідальний: ${form.responsibleRank} ${form.responsibleName} (${form.responsiblePhone})`,
      `Мережа: ${form.network} / ${form.localNetwork} | Тип АС: ${form.asType} | ГОД: ${form.securityClassification}`,
      `WiFi MAC: ${form.wifiMac || '—'} | ESET ID: ${form.esetInstanceId || '—'}`,
      `НСЗІ: ${form.infosecRank} ${form.infosecName} (${form.infosecPhone})`,
    ].join('\n')
    void navigator.clipboard?.writeText?.(summary)
    setCopiedFeedback(true)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)

    const parsedReceived = new Date(form.receivedAt)
    const isoReceivedAt = Number.isNaN(parsedReceived.getTime())
      ? ''
      : parsedReceived.toISOString()

    const parsedIssued = form.issuedAt ? new Date(form.issuedAt) : null
    const isoIssuedAt =
      parsedIssued && !Number.isNaN(parsedIssued.getTime()) ? parsedIssued.toISOString() : null

    const parsed = intakeFormSchema.safeParse({
      ...form,
      receivedAt: isoReceivedAt,
      checklistCompleted: editingRecord?.checklistCompleted ?? false,
      createdBy: editingRecord?.createdBy || operatorEmail,
    })

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? 'Перевірте коректність заповнення полів')
      return
    }

    const normalizedIssuedName = form.issuedToName.trim() || null
    const normalizedIssuedPhone = form.issuedToPhone.trim()
      ? normalizePhone(form.issuedToPhone)
      : null

    if (editingRecord) {
      onSubmitEdit({
        ...editingRecord,
        ...parsed.data,
        issuedAt: isoIssuedAt,
        issuedToName: normalizedIssuedName,
        issuedToPhone: normalizedIssuedPhone,
        isCompleted: Boolean(isoIssuedAt) || editingRecord.isCompleted,
      })
    } else {
      onSubmitCreate({
        ...parsed.data,
        issuedAt: isoIssuedAt,
        issuedToName: normalizedIssuedName,
        issuedToPhone: normalizedIssuedPhone,
      })
    }
    onClose()
  }

  return (
    <div className="modal-backdrop">
      <div
        className="card-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={dialogLabel}
      >
        {/* Dark Header matching Screenshots 11, 12, 13 */}
        <div className="card-modal-header">
          <div>
            <h2 className="card-modal-header__title">
              {isEditing ? (
                <>
                  <Pencil size={17} className="text-blue" />
                  <span>Редагування картки ID #{displayId}</span>
                </>
              ) : (
                <>
                  <Plus size={18} className="text-blue" />
                  <span>Створення нової картки</span>
                </>
              )}
            </h2>
            <p className="card-modal-header__subtitle">
              {isEditing
                ? 'Зміни негайно синхронізуються та відображаються в таблиці'
                : `Створення автоматично додасть рядок до таблиці з ID #${displayId}`}
            </p>
          </div>

          <div className="card-modal-header__actions">
            <button
              type="button"
              className="btn-copy-white"
              onClick={handleCopyModalToClipboard}
            >
              <Copy size={14} className="text-blue" />
              <span>{copiedFeedback ? 'Скопійовано!' : 'Копіювати в буфер'}</span>
            </button>
            <button
              type="button"
              className="btn-close-dark"
              aria-label="Закрити"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card-modal-body">
          {errorMessage && (
            <div className="alert alert--danger" role="alert">
              {errorMessage}
            </div>
          )}

          {/* Section 1: ВІДПОВІДАЛЬНИЙ ТА ПІДРОЗДІЛ */}
          <div className="modal-section">
            <h3 className="modal-section__title">
              <User size={14} />
              <span>ВІДПОВІДАЛЬНИЙ ТА ПІДРОЗДІЛ</span>
            </h3>
            <div className="modal-grid-12">
              <div className="col-span-4 form-field-light">
                <label htmlFor="intake-id">ID (Авто-Інкремент)</label>
                <input
                  id="intake-id"
                  type="text"
                  className="input-light input-light--readonly"
                  value={displayId}
                  readOnly
                />
              </div>
              <div className="col-span-8 form-field-light">
                <label htmlFor="intake-resp-name">
                  ПІБ відповідального <span className="text-danger">*</span>
                </label>
                <input
                  id="intake-resp-name"
                  name="responsibleName"
                  type="text"
                  className="input-light"
                  placeholder="ПІБ відповідального"
                  value={form.responsibleName}
                  onChange={handleFieldChange}
                  required
                />
              </div>

              <div className="col-span-4 form-field-light">
                <label htmlFor="intake-resp-rank">Звання відповідального</label>
                <select
                  id="intake-resp-rank"
                  name="responsibleRank"
                  className="select-light"
                  value={form.responsibleRank}
                  onChange={handleFieldChange}
                  required
                >
                  <option value="">— Оберіть звання —</option>
                  {responsibleRankOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-4 form-field-light">
                <label htmlFor="intake-resp-phone">Тел. відповідального</label>
                <input
                  id="intake-resp-phone"
                  name="responsiblePhone"
                  type="text"
                  className="input-light"
                  placeholder="0938209248"
                  value={form.responsiblePhone}
                  onChange={handleFieldChange}
                />
              </div>
              <div className="col-span-4 form-field-light">
                <label htmlFor="intake-subdivision">Підрозділ</label>
                <select
                  id="intake-subdivision"
                  name="subdivision"
                  className="select-light"
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
            </div>
          </div>

          {/* Section 2: ОПИС ПЕОМ ТА МЕРЕЖА */}
          <div className="modal-section">
            <h3 className="modal-section__title">
              <Laptop size={14} />
              <span>ОПИС ПЕОМ ТА МЕРЕЖА</span>
            </h3>
            <div className="modal-grid-12">
              <div className="col-span-4 form-field-light">
                <label htmlFor="intake-hostname">Імʼя ПЕОМ</label>
                <input
                  id="intake-hostname"
                  name="hostname"
                  type="text"
                  className="input-light"
                  placeholder="DESKTOP-AJ67GFP"
                  value={form.hostname}
                  onChange={handleFieldChange}
                  required
                />
              </div>
              <div className="col-span-4 form-field-light">
                <label htmlFor="intake-inventory">Інвентарний номер (Инв.н.)</label>
                <input
                  id="intake-inventory"
                  name="inventoryNumber"
                  type="text"
                  className="input-light"
                  placeholder="14"
                  value={form.inventoryNumber}
                  onChange={handleFieldChange}
                  required
                />
              </div>
              <div className="col-span-4 form-field-light">
                <label htmlFor="intake-peom-desc">Опис ПЕОМ</label>
                <select
                  id="intake-peom-desc"
                  name="peomDescription"
                  className="select-light"
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

              <div className="col-span-4 form-field-light">
                <label htmlFor="intake-network">Мережа</label>
                <select
                  id="intake-network"
                  name="network"
                  className="select-light"
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
              <div className="col-span-4 form-field-light">
                <label htmlFor="intake-local-net">Мережа локальна</label>
                <input
                  id="intake-local-net"
                  name="localNetwork"
                  type="text"
                  className="input-light"
                  value={form.localNetwork}
                  onChange={handleFieldChange}
                />
              </div>
              <div className="col-span-4 form-field-light">
                <label htmlFor="intake-classification">ГОД</label>
                <select
                  id="intake-classification"
                  name="securityClassification"
                  className="select-light"
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

              <div className="col-span-4 form-field-light">
                <label htmlFor="intake-as-type">Тип АС</label>
                <select
                  id="intake-as-type"
                  name="asType"
                  className="select-light"
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
              <div className="col-span-4 form-field-light">
                <label htmlFor="intake-location">Місцезнаходження</label>
                <select
                  id="intake-location"
                  name="location"
                  className="select-light"
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
              <div className="col-span-4 form-field-light">
                <label htmlFor="intake-unit">Військова частина</label>
                <input
                  id="intake-unit"
                  name="militaryUnit"
                  type="text"
                  className="input-light"
                  value={form.militaryUnit}
                  onChange={handleFieldChange}
                />
              </div>

              <div className="col-span-4 form-field-light">
                <label htmlFor="intake-update-type">Тип оновлення</label>
                <select
                  id="intake-update-type"
                  name="updateType"
                  className="select-light"
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
              <div className="col-span-4 form-field-light">
                <label htmlFor="intake-mac">WiFi MAC</label>
                <input
                  id="intake-mac"
                  name="wifiMac"
                  type="text"
                  className="input-light"
                  placeholder="00:1A:2B:3C:4D:5E"
                  value={form.wifiMac}
                  onChange={handleFieldChange}
                />
              </div>
              <div className="col-span-4" />

              <div className="col-span-8 form-field-light">
                <label htmlFor="intake-eset">ESET ProductInstanceID</label>
                <input
                  id="intake-eset"
                  name="esetInstanceId"
                  type="text"
                  className="input-light"
                  placeholder="319a38a7-d25c-4b19-ae1f-ab9a6febfc46"
                  value={form.esetInstanceId}
                  onChange={handleFieldChange}
                />
              </div>
              <div className="col-span-4 form-field-light">
                <label htmlFor="intake-policy">Політика</label>
                <select
                  id="intake-policy"
                  name="policy"
                  className="select-light"
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
            </div>
          </div>

          {/* Section 3: ДАТА/ЧАС ПРИЙНЯТТЯ ТА ДАТА/ЧАС ВИДАЧІ */}
          <div className="modal-section">
            <h3 className="modal-section__title">
              <Calendar size={14} />
              <span>ДАТА/ЧАС ПРИЙНЯТТЯ ТА ДАТА/ЧАС ВИДАЧІ</span>
            </h3>
            <div className="modal-grid-12">
              <div className="col-span-6 form-field-light">
                <label htmlFor="intake-received">Дата/час прийняття</label>
                <input
                  id="intake-received"
                  name="receivedAt"
                  type="datetime-local"
                  className="input-light"
                  value={form.receivedAt}
                  onChange={handleFieldChange}
                />
              </div>
              <div className="col-span-6 form-field-light">
                <label htmlFor="intake-issued-at">Дата/час видачі</label>
                <input
                  id="intake-issued-at"
                  name="issuedAt"
                  type="datetime-local"
                  className="input-light"
                  value={form.issuedAt}
                  onChange={handleFieldChange}
                />
              </div>

              <div className="col-span-6 form-field-light">
                <label htmlFor="intake-issued-name">Видано ФІО</label>
                <input
                  id="intake-issued-name"
                  name="issuedToName"
                  type="text"
                  className="input-light"
                  placeholder="ПІБ отримувача"
                  value={form.issuedToName}
                  onChange={handleFieldChange}
                />
              </div>
              <div className="col-span-6 form-field-light">
                <label htmlFor="intake-issued-phone">Видано тел.</label>
                <input
                  id="intake-issued-phone"
                  name="issuedToPhone"
                  type="text"
                  className="input-light"
                  placeholder="0973458989"
                  value={form.issuedToPhone}
                  onChange={handleFieldChange}
                />
              </div>
            </div>
          </div>

          {/* Section 4: СЛУЖБА ЗАХИСТУ (НСЗІ) */}
          <div className="modal-section">
            <h3 className="modal-section__title">
              <Shield size={14} />
              <span>СЛУЖБА ЗАХИСТУ (НСЗІ)</span>
            </h3>
            <div className="modal-grid-12">
              <div className="col-span-4 form-field-light">
                <label htmlFor="intake-infosec-rank">НСЗІ звання</label>
                <select
                  id="intake-infosec-rank"
                  name="infosecRank"
                  className="select-light"
                  value={form.infosecRank}
                  onChange={handleFieldChange}
                  required
                >
                  <option value="">— Оберіть звання —</option>
                  {infosecRankOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-4 form-field-light">
                <label htmlFor="intake-infosec-name">НСЗІ ФІО</label>
                <input
                  id="intake-infosec-name"
                  name="infosecName"
                  type="text"
                  className="input-light"
                  value={form.infosecName}
                  onChange={handleFieldChange}
                />
              </div>
              <div className="col-span-4 form-field-light">
                <label htmlFor="intake-infosec-phone">НСЗІ тел</label>
                <input
                  id="intake-infosec-phone"
                  name="infosecPhone"
                  type="text"
                  className="input-light"
                  value={form.infosecPhone}
                  onChange={handleFieldChange}
                />
              </div>
            </div>
          </div>

          {/* Footer matching Screenshots 11 & 12 */}
          <div className="card-modal-footer">
            <button
              type="button"
              className="btn-footer-secondary"
              onClick={handleCopyModalToClipboard}
            >
              <Copy size={14} />
              <span>Копіювати в буфер обміну</span>
            </button>

            <div className="card-modal-footer__right">
              <button type="button" className="btn-footer-secondary" onClick={onClose}>
                Скасувати
              </button>
              <button type="submit" className="btn-orange-cta">
                <Check size={15} />
                <span>{isEditing ? 'Зберегти зміни' : 'Створити та зберегти в таблицю'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
