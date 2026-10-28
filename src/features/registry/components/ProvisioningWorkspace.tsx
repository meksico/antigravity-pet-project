import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_CHECKLIST_STEPS,
  DEFAULT_DICTIONARIES,
  SYNTHETIC_LAPTOP_RECORDS,
} from '../../../mocks/syntheticData'
import type {
  ChecklistStepItem,
  LaptopRecord,
  ReferenceDictionaries,
} from '../../../schemas/laptopRecordSchema'
import {
  matchesMacSearch,
} from '../../../services/converters/normalizers'
import { formatCardClipboardText } from '../../../services/converters/cardClipboardFormatter'
import { GoogleSheetsClient } from '../../../services/sheets/sheetsClient'
import { OperatorSessionBar } from '../../auth/components/OperatorSessionBar'
import { useAuth } from '../../auth/hooks/useAuth'
import { ChecklistDrawer } from '../../checklist/components/ChecklistDrawer'
import { BulkActionsBar } from './BulkActionsBar'
import { HandoverModal } from './HandoverModal'
import { IntakeModal } from './IntakeModal'
import { PeomCardList } from './PeomCardList'
import { RegistryFilterBar, type RegistryFiltersState } from './RegistryFilterBar'
import { RegistryGrid } from './RegistryGrid'

const INITIAL_FILTERS: RegistryFiltersState = {
  searchQuery: '',
  status: 'all',
  responsible: 'all',
  subdivision: 'all',
  network: 'all',
  asType: 'all',
  securityClassification: 'all',
  columnGroup: 'all',
  sortDirection: 'desc',
  viewMode: 'split',
}

export function ProvisioningWorkspace() {
  const { session, spreadsheetId, presets, getAccessToken } = useAuth()

  const [records, setRecords] = useState<readonly LaptopRecord[]>(SYNTHETIC_LAPTOP_RECORDS)
  const [dictionaries, setDictionaries] = useState<ReferenceDictionaries>(DEFAULT_DICTIONARIES)
  const [checklistSteps, setChecklistSteps] =
    useState<readonly ChecklistStepItem[]>(DEFAULT_CHECKLIST_STEPS)
  const [filters, setFilters] = useState<RegistryFiltersState>(INITIAL_FILTERS)
  const [selectedIds, setSelectedIds] = useState<readonly number[]>([])

  const [isCardModalOpen, setIsCardModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<LaptopRecord | null>(null)
  const [activeChecklistRecord, setActiveChecklistRecord] = useState<LaptopRecord | null>(null)
  const [activeHandoverRecord, setActiveHandoverRecord] = useState<LaptopRecord | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncBanner, setSyncBanner] = useState<string | null>(null)
  const hasAutoSyncedRef = useRef(false)

  const sheetsClient = useMemo(() => {
    if (session?.mode === 'google' && spreadsheetId.trim()) {
      return new GoogleSheetsClient({
        spreadsheetId: spreadsheetId.trim(),
        getAccessToken,
      })
    }
    return null
  }, [session?.mode, spreadsheetId, getAccessToken])

  const handleSyncWithGoogleSheets = useCallback(async () => {
    if (!sheetsClient) {
      return
    }
    setIsSyncing(true)
    setSyncBanner(null)
    try {
      const workbook = await sheetsClient.fetchWorkbookData()
      setRecords(workbook.records)
      setDictionaries(workbook.dictionaries)
      setChecklistSteps(workbook.checklistSteps)
      setSyncBanner(`Синхронізовано з Google Sheets (${workbook.records.length} записів)`)
    } catch (error) {
      setSyncBanner(
        error instanceof Error ? error.message : 'Помилка синхронізації з Google Sheets',
      )
    } finally {
      setIsSyncing(false)
    }
  }, [sheetsClient])

  // Automatically sync with the configured Google Spreadsheet upon Google login
  useEffect(() => {
    if (sheetsClient && !hasAutoSyncedRef.current) {
      hasAutoSyncedRef.current = true
      void handleSyncWithGoogleSheets()
    }
  }, [sheetsClient, handleSyncWithGoogleSheets])

  // Automatically dismiss notifier banner after 3 seconds
  useEffect(() => {
    if (!syncBanner) {
      return
    }
    const timer = window.setTimeout(() => {
      setSyncBanner(null)
    }, 3000)
    return () => {
      window.clearTimeout(timer)
    }
  }, [syncBanner])

  const totalCount = records.length
  const completedCount = useMemo(() => records.filter((r) => r.isCompleted).length, [records])
  const inProgressCount = totalCount - completedCount
  const nextAutoId = useMemo(
    () => records.reduce((max, r) => (r.id > max ? r.id : max), 0) + 1,
    [records],
  )

  const filteredRecords = useMemo(() => {
    const rawQuery = filters.searchQuery.trim().toLowerCase()

    const matching = records.filter((record) => {
      if (filters.status === 'completed' && !record.isCompleted) return false
      if (filters.status === 'pending' && record.isCompleted) return false
      if (filters.responsible !== 'all' && record.responsibleName !== filters.responsible) {
        return false
      }
      if (filters.subdivision !== 'all' && record.subdivision !== filters.subdivision) return false
      if (filters.network !== 'all' && record.network !== filters.network) return false
      if (filters.asType !== 'all' && record.asType !== filters.asType) return false
      if (
        filters.securityClassification !== 'all' &&
        record.securityClassification !== filters.securityClassification
      ) {
        return false
      }

      if (!rawQuery) {
        return true
      }

      const searchableFields = [
        String(record.id),
        record.inventoryNumber,
        record.hostname,
        record.wifiMac,
        record.esetInstanceId,
        record.responsibleName,
        record.issuedToName ?? '',
        record.subdivision,
        record.militaryUnit,
      ]
        .join(' ')
        .toLowerCase()

      const matchesText = searchableFields.includes(rawQuery)
      return matchesText || matchesMacSearch(record.wifiMac, filters.searchQuery)
    })

    return [...matching].sort((a, b) =>
      filters.sortDirection === 'desc' ? b.id - a.id : a.id - b.id,
    )
  }, [records, filters])

  const handleUpdateFilters = (partial: Partial<RegistryFiltersState>) => {
    setFilters((prev) => ({ ...prev, ...partial }))
  }

  const handleOpenCreateModal = () => {
    setEditingRecord(null)
    setIsCardModalOpen(true)
  }

  const handleOpenEditModal = (record: LaptopRecord) => {
    setEditingRecord(record)
    setIsCardModalOpen(true)
  }

  const handleAddNewSubdivision = async (newSubdivision: string) => {
    const trimmed = newSubdivision.trim()
    if (!trimmed) return

    setDictionaries((prev) => {
      if (prev.subdivisions.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
        return prev
      }
      return {
        ...prev,
        subdivisions: [...prev.subdivisions, trimmed],
      }
    })

    if (sheetsClient) {
      try {
        await sheetsClient.appendDictionaryValue('E', trimmed)
        setSyncBanner(`Підрозділ «${trimmed}» успішно додано до довідника _списки`)
      } catch (error) {
        setSyncBanner(
          error instanceof Error
            ? error.message
            : `Помилка додавання підрозділу «${trimmed}» до таблиці Google Sheets`,
        )
      }
    }
  }

  const handleAddNewMilitaryUnit = async (newUnit: string) => {
    const trimmed = newUnit.trim()
    if (!trimmed) return

    setDictionaries((prev) => {
      if (prev.militaryUnits.some((u) => u.toLowerCase() === trimmed.toLowerCase())) {
        return prev
      }
      return {
        ...prev,
        militaryUnits: [...prev.militaryUnits, trimmed],
      }
    })

    if (sheetsClient) {
      try {
        await sheetsClient.appendDictionaryValue('H', trimmed)
        setSyncBanner(`Військову частину «${trimmed}» успішно додано до довідника _списки`)
      } catch (error) {
        setSyncBanner(
          error instanceof Error
            ? error.message
            : `Помилка додавання військової частини «${trimmed}» до таблиці Google Sheets`,
        )
      }
    }
  }

  const handleCreateIntake = async (
    draft: Omit<LaptopRecord, 'rowIndex' | 'id' | 'isCompleted'>,
  ) => {
    const maxId = records.reduce((max, r) => (r.id > max ? r.id : max), 0)
    const maxRowIndex = records.reduce((max, r) => (r.rowIndex > max ? r.rowIndex : max), 1)

    const optimisticRecord: LaptopRecord = {
      ...draft,
      id: maxId + 1,
      rowIndex: maxRowIndex + 1,
      isCompleted: Boolean(draft.issuedAt),
    }

    setRecords((prev) => [...prev, optimisticRecord])

    if (draft.subdivision && !dictionaries.subdivisions.includes(draft.subdivision)) {
      void handleAddNewSubdivision(draft.subdivision)
    }
    if (draft.militaryUnit && !dictionaries.militaryUnits.includes(draft.militaryUnit)) {
      void handleAddNewMilitaryUnit(draft.militaryUnit)
    }

    if (sheetsClient) {
      try {
        const persisted = await sheetsClient.createLaptopRecord(draft, maxRowIndex + 1)
        setRecords((prev) =>
          prev.map((item) => (item.id === optimisticRecord.id ? persisted : item)),
        )
      } catch (error) {
        setSyncBanner(
          error instanceof Error ? error.message : 'Помилка запису нового лептопа в Google Sheets',
        )
      }
    }
  }

  const handleEditRecord = async (updatedRecord: LaptopRecord) => {
    setRecords((prev) => prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r)))

    if (
      updatedRecord.subdivision &&
      !dictionaries.subdivisions.includes(updatedRecord.subdivision)
    ) {
      void handleAddNewSubdivision(updatedRecord.subdivision)
    }
    if (
      updatedRecord.militaryUnit &&
      !dictionaries.militaryUnits.includes(updatedRecord.militaryUnit)
    ) {
      void handleAddNewMilitaryUnit(updatedRecord.militaryUnit)
    }

    if (sheetsClient) {
      try {
        await sheetsClient.updateLaptopRecord(updatedRecord)
      } catch (error) {
        setSyncBanner(error instanceof Error ? error.message : 'Помилка збереження змін картки')
      }
    }
  }

  const handleDuplicateCard = async (source: LaptopRecord) => {
    const { rowIndex: _r, id: _id, isCompleted: _c, ...draft } = source
    await handleCreateIntake({
      ...draft,
      hostname: '',
      inventoryNumber: '',
      wifiMac: '',
      esetInstanceId: '',
      receivedAt: source.receivedAt || new Date().toISOString(),
      issuedAt: source.issuedAt,
      issuedToName: source.issuedToName,
      issuedToPhone: source.issuedToPhone,
      checklistCompleted: source.checklistCompleted,
      createdBy: session?.email ?? source.createdBy ?? 'demo.operator@example.org',
    })
  }

  const handleDeleteCard = async (recordId: number) => {
    const target = records.find((r) => r.id === recordId)
    setRecords((prev) =>
      prev
        .filter((r) => r.id !== recordId)
        .map((r) => {
          if (target && r.rowIndex > target.rowIndex) {
            return { ...r, rowIndex: r.rowIndex - 1 }
          }
          return r
        }),
    )
    setSelectedIds((prev) => prev.filter((id) => id !== recordId))

    if (sheetsClient && target) {
      try {
        await sheetsClient.deleteLaptopRecord(target)
        setSyncBanner(
          `Картку ID #${recordId} (${target.hostname || 'без імені'}) успішно видалено з Google Sheets`,
        )
      } catch (error) {
        setSyncBanner(
          error instanceof Error
            ? error.message
            : `Помилка видалення рядка картки ID #${recordId} з Google Sheets`,
        )
      }
    }
  }

  const handleCopyCardToClipboard = (record: LaptopRecord) => {
    const text = formatCardClipboardText(record)
    void navigator.clipboard?.writeText?.(text)
    setSyncBanner(`Картку ID #${record.id} (${record.hostname || 'без імені'}) скопійовано в буфер обміну`)
  }

  const handleConfirmChecklist = async (recordId: number, completed: boolean) => {
    const target = records.find((r) => r.id === recordId)
    if (!target) return

    const updatedRecord: LaptopRecord = {
      ...target,
      checklistCompleted: completed,
    }

    setRecords((prev) => prev.map((r) => (r.id === recordId ? updatedRecord : r)))

    if (sheetsClient) {
      try {
        await sheetsClient.updateLaptopRecord(updatedRecord)
      } catch (error) {
        setSyncBanner(error instanceof Error ? error.message : 'Помилка збереження чек-ліста')
      }
    }
  }

  const handleConfirmHandover = async (
    recordId: number,
    payload: { issuedAt: string; issuedToName: string; issuedToPhone: string },
  ) => {
    const target = records.find((r) => r.id === recordId)
    if (!target) return

    const updatedRecord: LaptopRecord = {
      ...target,
      issuedAt: payload.issuedAt,
      issuedToName: payload.issuedToName,
      issuedToPhone: payload.issuedToPhone,
      isCompleted: true,
    }

    setRecords((prev) => prev.map((r) => (r.id === recordId ? updatedRecord : r)))

    if (sheetsClient) {
      try {
        await sheetsClient.updateLaptopRecord(updatedRecord)
      } catch (error) {
        setSyncBanner(error instanceof Error ? error.message : 'Помилка збереження видачі')
      }
    }
  }

  const handleToggleSelectRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const handleToggleSelectAll = () => {
    const visibleIds = filteredRecords.map((r) => r.id)
    const allVisibleSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))

    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])))
    }
  }

  const handleApplyBulkChanges = async (changes: {
    policy?: string
    network?: string
    checklistCompleted?: boolean
  }) => {
    const selectedSet = new Set(selectedIds)
    const updatedBatch = records
      .filter((record) => selectedSet.has(record.id))
      .map((record) => ({
        ...record,
        policy: changes.policy ?? record.policy,
        network: changes.network ?? record.network,
        checklistCompleted: changes.checklistCompleted ?? record.checklistCompleted,
      }))

    const updatedById = new Map(updatedBatch.map((r) => [r.id, r]))
    setRecords((prev) => prev.map((record) => updatedById.get(record.id) ?? record))

    setSelectedIds([])

    if (sheetsClient && updatedBatch.length > 0) {
      try {
        await sheetsClient.batchUpdateLaptopRecords(updatedBatch)
      } catch (error) {
        setSyncBanner(error instanceof Error ? error.message : 'Помилка пакетного оновлення')
      }
    }
  }

  const showCards = filters.viewMode === 'cards' || filters.viewMode === 'split'
  const showTable = filters.viewMode === 'table' || filters.viewMode === 'split'

  return (
    <div className="workspace-shell">
      <div className="dark-chrome">
        <OperatorSessionBar
          totalCount={totalCount}
          inProgressCount={inProgressCount}
          completedCount={completedCount}
          statusFilter={filters.status}
          viewMode={filters.viewMode}
          onSelectStatusFilter={(status) => handleUpdateFilters({ status })}
          onSelectViewMode={(viewMode) => handleUpdateFilters({ viewMode })}
          onOpenCreateCard={handleOpenCreateModal}
          onSyncWithGoogleSheets={() => void handleSyncWithGoogleSheets()}
          isSyncing={isSyncing}
        />

        <RegistryFilterBar
          records={records}
          filters={filters}
          dictionaries={dictionaries}
          onUpdateFilters={handleUpdateFilters}
        />
      </div>

      <main className="workspace-main">
        {syncBanner && (
          <div className="sync-banner" role="status">
            <span>{syncBanner}</span>
            <button
              type="button"
              className="btn-footer-secondary"
              onClick={() => setSyncBanner(null)}
            >
              Закрити
            </button>
          </div>
        )}

        <BulkActionsBar
          selectedIds={selectedIds}
          dictionaries={dictionaries}
          onApplyBulkChanges={(changes) => void handleApplyBulkChanges(changes)}
          onClearSelection={() => setSelectedIds([])}
        />

        <div className={`workspace-split workspace-split--${filters.viewMode}`}>
          {showCards && (
            <PeomCardList
              records={filteredRecords}
              onOpenChecklist={(record) => setActiveChecklistRecord(record)}
              onOpenHandover={(record) => setActiveHandoverRecord(record)}
              onEditCard={handleOpenEditModal}
              onDuplicateCard={(record) => void handleDuplicateCard(record)}
              onDeleteCard={(recordId) => void handleDeleteCard(recordId)}
              onCopyCardToClipboard={handleCopyCardToClipboard}
            />
          )}

          {showTable && (
            <RegistryGrid
              records={filteredRecords}
              selectedIds={selectedIds}
              columnGroup={filters.columnGroup}
              onToggleSelectRow={handleToggleSelectRow}
              onToggleSelectAll={handleToggleSelectAll}
              onOpenChecklist={(record) => setActiveChecklistRecord(record)}
              onOpenHandover={(record) => setActiveHandoverRecord(record)}
              onEditCard={handleOpenEditModal}
              onDeleteCard={(recordId) => void handleDeleteCard(recordId)}
              onCopyCardToClipboard={handleCopyCardToClipboard}
            />
          )}
        </div>
      </main>

      <IntakeModal
        key={
          isCardModalOpen
            ? editingRecord
              ? `edit-${editingRecord.id}`
              : 'create-new'
            : 'closed-card-modal'
        }
        isOpen={isCardModalOpen}
        editingRecord={editingRecord}
        nextAutoId={nextAutoId}
        dictionaries={dictionaries}
        presets={presets}
        operatorEmail={session?.email ?? 'demo.operator@example.org'}
        onClose={() => {
          setIsCardModalOpen(false)
          setEditingRecord(null)
        }}
        onSubmitCreate={(draft) => void handleCreateIntake(draft)}
        onSubmitEdit={(updated) => void handleEditRecord(updated)}
        onAddNewSubdivision={handleAddNewSubdivision}
        onAddNewMilitaryUnit={handleAddNewMilitaryUnit}
      />

      <ChecklistDrawer
        key={activeChecklistRecord?.id ?? 'closed-checklist'}
        record={activeChecklistRecord}
        steps={checklistSteps}
        onClose={() => setActiveChecklistRecord(null)}
        onConfirmChecklist={(id, completed) => void handleConfirmChecklist(id, completed)}
      />

      <HandoverModal
        key={activeHandoverRecord?.id ?? 'closed-handover'}
        record={activeHandoverRecord}
        onClose={() => setActiveHandoverRecord(null)}
        onConfirmHandover={(id, payload) => void handleConfirmHandover(id, payload)}
      />
    </div>
  )
}
