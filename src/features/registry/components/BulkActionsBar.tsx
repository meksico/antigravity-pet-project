import { CheckSquare, Layers, X } from 'lucide-react'
import { useState } from 'react'
import type { ReferenceDictionaries } from '../../../schemas/laptopRecordSchema'

interface BulkActionsBarProps {
  selectedIds: readonly number[]
  dictionaries: ReferenceDictionaries
  onApplyBulkChanges: (changes: {
    policy?: string
    network?: string
    checklistCompleted?: boolean
  }) => void
  onClearSelection: () => void
}

export function BulkActionsBar({
  selectedIds,
  dictionaries,
  onApplyBulkChanges,
  onClearSelection,
}: BulkActionsBarProps) {
  const [selectedPolicy, setSelectedPolicy] = useState('')
  const [selectedNetwork, setSelectedNetwork] = useState('')
  const [markChecklistDone, setMarkChecklistDone] = useState(false)

  if (selectedIds.length === 0) {
    return null
  }

  const handleApply = () => {
    onApplyBulkChanges({
      policy: selectedPolicy || undefined,
      network: selectedNetwork || undefined,
      checklistCompleted: markChecklistDone ? true : undefined,
    })
    setSelectedPolicy('')
    setSelectedNetwork('')
    setMarkChecklistDone(false)
  }

  return (
    <div className="bulk-bar" data-testid="bulk-actions-bar" role="region" aria-label="Масові дії">
      <div className="bulk-bar__summary">
        <Layers size={16} aria-hidden="true" />
        <strong>Вибрано: {selectedIds.length}</strong>
        <span className="bulk-bar__hint">(один пакетний запит values:batchUpdate)</span>
      </div>

      <div className="bulk-bar__controls">
        <select
          aria-label="Масова зміна політики"
          className="select select--sm"
          value={selectedPolicy}
          onChange={(e) => setSelectedPolicy(e.target.value)}
        >
          <option value="">— Змінити політику —</option>
          {dictionaries.policies.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          aria-label="Масова зміна мережі"
          className="select select--sm"
          value={selectedNetwork}
          onChange={(e) => setSelectedNetwork(e.target.value)}
        >
          <option value="">— Змінити мережу —</option>
          {dictionaries.networks.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <label className="bulk-bar__checkbox">
          <input
            type="checkbox"
            checked={markChecklistDone}
            onChange={(e) => setMarkChecklistDone(e.target.checked)}
          />
          <CheckSquare size={14} />
          <span>Чек-ліст виконано</span>
        </label>

        <button type="button" className="btn btn--primary btn--sm" onClick={handleApply}>
          Застосувати до вибраних
        </button>

        <button type="button" className="btn btn--ghost btn--sm" onClick={onClearSelection}>
          <X size={14} />
          <span>Скасувати вибір</span>
        </button>
      </div>
    </div>
  )
}

