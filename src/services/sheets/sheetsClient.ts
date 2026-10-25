import {
  type ChecklistStepItem,
  type LaptopRecord,
  parseChecklistSheet,
  parseDictionariesSheet,
  parseSheetRowToLaptopRecord,
  type ReferenceDictionaries,
} from '../../schemas/laptopRecordSchema'
import { DEFAULT_CHECKLIST_STEPS, DEFAULT_DICTIONARIES } from '../../mocks/syntheticData'
import { normalizeIntegerString } from '../converters/normalizers'
import { ClientRateLimiter, executeWithRetry } from './rateLimiter'
import {
  buildBatchDisjointUpdatePayloads,
  buildDisjointRowUpdatePayloads,
  REGISTRY_SHEET_NAME,
} from './sheetsFormulaGuard'

export class RowIdMismatchError extends Error {
  constructor(rowIndex: number, expectedId: number, actualCell: string) {
    super(
      `Конфлікт рядка #${rowIndex}: очікувався ID=${expectedId}, але в Google Sheets знайдено "${actualCell}". Оновіть таблицю.`,
    )
    this.name = 'RowIdMismatchError'
  }
}

export interface WorkbookData {
  records: LaptopRecord[]
  dictionaries: ReferenceDictionaries
  checklistSteps: ChecklistStepItem[]
}

export interface GoogleSheetsClientConfig {
  spreadsheetId: string
  getAccessToken: () => string | null
  fetchImpl?: typeof fetch
  limiter?: ClientRateLimiter
}

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

/**
 * Typed client for Google Sheets REST API v4 with formula-safe disjoint writes (AC-003, AC-009, AC-010).
 */
export class GoogleSheetsClient {
  private readonly spreadsheetId: string
  private readonly getAccessToken: () => string | null
  private readonly fetchImpl: typeof fetch
  private readonly limiter: ClientRateLimiter

  constructor(config: GoogleSheetsClientConfig) {
    this.spreadsheetId = config.spreadsheetId
    this.getAccessToken = config.getAccessToken
    this.fetchImpl = config.fetchImpl ?? ((input, init) => fetch(input, init))
    this.limiter = config.limiter ?? new ClientRateLimiter(50, 60_000)
  }

  private async requestJson<T>(path: string, init?: RequestInit): Promise<T> {
    const token = this.getAccessToken()
    if (!token) {
      const err = new Error('Відсутній OAuth 2.0 токен доступу. Авторизуйтесь через Google.') as Error & {
        status?: number
      }
      err.status = 401
      throw err
    }

    return executeWithRetry(
      async () => {
        const response = await this.fetchImpl(
          `${SHEETS_API_BASE}/${encodeURIComponent(this.spreadsheetId)}${path}`,
          {
            ...init,
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              ...(init?.headers ?? {}),
            },
          },
        )

        if (!response.ok) {
          const text = await response.text().catch(() => '')
          const err = new Error(
            `Google Sheets API HTTP ${response.status}: ${text || response.statusText}`,
          ) as Error & { status?: number }
          err.status = response.status
          throw err
        }

        return (await response.json()) as T
      },
      { limiter: this.limiter },
    )
  }

  /**
   * Hydrates 'Список звітності', '_списки', and 'Чек-ліст!A1:A30' (Column A only) in a single batchGet request.
   */
  public async fetchWorkbookData(): Promise<WorkbookData> {
    const ranges = [
      `'${REGISTRY_SHEET_NAME}'!A1:AB2000`,
      `'_списки'!A1:I25`,
      `'Чек-ліст'!A1:A30`,
    ]
    const query = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&')
    const url = `/values:batchGet?${query}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`

    const data = await this.requestJson<{
      valueRanges?: { range: string; values?: unknown[][] }[]
    }>(url)

    const registryRows = data.valueRanges?.[0]?.values ?? []
    const dictRows = data.valueRanges?.[1]?.values ?? []
    const checklistRows = data.valueRanges?.[2]?.values ?? []

    const records: LaptopRecord[] = []
    // Row 0 is header row (Spreadsheet Row 1); data starts at index 1 (Spreadsheet Row 2)
    for (let i = 1; i < registryRows.length; i += 1) {
      const parsed = parseSheetRowToLaptopRecord(registryRows[i], i + 1)
      if (parsed) {
        records.push(parsed)
      }
    }

    const dictionaries =
      dictRows.length > 1 ? parseDictionariesSheet(dictRows) : DEFAULT_DICTIONARIES
    const checklistSteps =
      checklistRows.length > 0 ? parseChecklistSheet(checklistRows) : DEFAULT_CHECKLIST_STEPS

    return {
      records,
      dictionaries,
      checklistSteps,
    }
  }

  /**
   * Verifies that row `record.rowIndex` in 'Список звітності' still holds `record.id` in Column A,
   * then writes disjoint ranges A..E and G..AB (preserving Column F's array formula).
   */
  public async updateLaptopRecord(record: LaptopRecord): Promise<void> {
    const idCheckRange = encodeURIComponent(`'${REGISTRY_SHEET_NAME}'!A${record.rowIndex}`)
    const idCheck = await this.requestJson<{ values?: unknown[][] }>(
      `/values/${idCheckRange}?valueRenderOption=UNFORMATTED_VALUE`,
    )
    const actualIdStr = normalizeIntegerString(idCheck.values?.[0]?.[0])
    const actualId = Number.parseInt(actualIdStr, 10)

    if (actualId !== record.id) {
      throw new RowIdMismatchError(record.rowIndex, record.id, actualIdStr)
    }

    const disjointRanges = buildDisjointRowUpdatePayloads(record)
    await this.requestJson('/values:batchUpdate', {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: disjointRanges,
      }),
    })
  }

  /**
   * Bundles multiple row updates into a single `values:batchUpdate` request (AC-009).
   */
  public async batchUpdateLaptopRecords(records: readonly LaptopRecord[]): Promise<void> {
    if (records.length === 0) {
      return
    }
    const disjointRanges = buildBatchDisjointUpdatePayloads(records)
    await this.requestJson('/values:batchUpdate', {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: disjointRanges,
      }),
    })
  }

  /**
   * Reads Column A to determine the next available row and MAX(ID) + 1, then writes disjoint ranges A..E and G..AB.
   */
  public async createLaptopRecord(
    draft: Omit<LaptopRecord, 'rowIndex' | 'id' | 'isCompleted'>,
  ): Promise<LaptopRecord> {
    const colARange = encodeURIComponent(`'${REGISTRY_SHEET_NAME}'!A1:A2000`)
    const colAData = await this.requestJson<{ values?: unknown[][] }>(
      `/values/${colARange}?valueRenderOption=UNFORMATTED_VALUE`,
    )
    const rows = colAData.values ?? [['ID']]
    let maxId = 0
    let lastPopulatedRowIndex = 1 // 1-based header row
    for (let i = 1; i < rows.length; i += 1) {
      const idStr = normalizeIntegerString(rows[i]?.[0])
      const num = Number.parseInt(idStr, 10)
      if (!Number.isNaN(num) && num > 0) {
        if (num > maxId) maxId = num
        lastPopulatedRowIndex = i + 1
      }
    }

    const nextRowIndex = lastPopulatedRowIndex + 1
    const nextId = maxId + 1
    const newRecord: LaptopRecord = {
      ...draft,
      rowIndex: nextRowIndex,
      id: nextId,
      isCompleted: Boolean(draft.issuedAt),
    }

    const disjointRanges = buildDisjointRowUpdatePayloads(newRecord)
    await this.requestJson('/values:batchUpdate', {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: disjointRanges,
      }),
    })

    return newRecord
  }
}

