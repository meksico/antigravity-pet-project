import {
  type ChecklistStepItem,
  type LaptopRecord,
  parseChecklistSheet,
  parseDictionariesSheet,
  parseSheetRowToLaptopRecord,
  type ReferenceDictionaries,
} from '../../schemas/laptopRecordSchema'
import { DEFAULT_CHECKLIST_STEPS, DEFAULT_DICTIONARIES } from '../../mocks/syntheticData'
import { normalizeIntegerString, sanitizeFormulaTrigger } from '../converters/normalizers'
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
export const CONSECUTIVE_EMPTY_ROWS_THRESHOLD = 3

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
   * Hydrates 'Список звітності', '_списки' (Columns A..M), and 'Чек-ліст!A1:A30' (Column A only) in a single batchGet request.
   */
  public async fetchWorkbookData(): Promise<WorkbookData> {
    const ranges = [
      `'${REGISTRY_SHEET_NAME}'!A1:AB2000`,
      `'_списки'!A1:M100`,
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
    let consecutiveEmptyRows = 0
    // Row 0 is header row (Spreadsheet Row 1); data starts at index 1 (Spreadsheet Row 2)
    for (let i = 1; i < registryRows.length; i += 1) {
      const parsed = parseSheetRowToLaptopRecord(registryRows[i], i + 1)
      if (parsed) {
        records.push(parsed)
        consecutiveEmptyRows = 0
      } else {
        consecutiveEmptyRows += 1
        // After encountering consecutive empty rows after populated records, stop scanning
        if (consecutiveEmptyRows >= CONSECUTIVE_EMPTY_ROWS_THRESHOLD && records.length > 0) {
          break
        }
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

  private registrySheetId: number | null = null

  /**
   * Fetches the numeric sheetId of 'Список звітності' from spreadsheet metadata, or falls back to 0.
   */
  public async getRegistrySheetId(): Promise<number> {
    if (this.registrySheetId !== null) {
      return this.registrySheetId
    }

    try {
      const metadata = await this.requestJson<{
        sheets?: Array<{ properties?: { sheetId?: number; title?: string } }>
      }>('?fields=sheets.properties(sheetId,title)')

      const target = metadata.sheets?.find(
        (s) => s.properties?.title === REGISTRY_SHEET_NAME,
      )
      const id = target?.properties?.sheetId ?? 0
      this.registrySheetId = id
      return id
    } catch {
      this.registrySheetId = 0
      return 0
    }
  }

  /**
   * Ensures the registry sheet has enough rows to accommodate targetRow.
   * If targetRow exceeds grid limits, automatically appends rows.
   */
  public async ensureGridCapacity(targetRow: number): Promise<void> {
    const sheetId = await this.getRegistrySheetId()
    if (!sheetId && sheetId !== 0) return

    try {
      const metadata = await this.requestJson<{
        sheets?: Array<{
          properties?: {
            sheetId?: number
            title?: string
            gridProperties?: { rowCount?: number; columnCount?: number }
          }
        }>
      }>('?fields=sheets.properties(sheetId,title,gridProperties)')

      const target = metadata.sheets?.find(
        (s) => s.properties?.title === REGISTRY_SHEET_NAME,
      )
      const currentRowCount = target?.properties?.gridProperties?.rowCount ?? 1000

      if (targetRow > currentRowCount) {
        const rowsToAdd = Math.max(100, targetRow - currentRowCount + 50)
        await this.requestJson(':batchUpdate', {
          method: 'POST',
          body: JSON.stringify({
            requests: [
              {
                appendDimension: {
                  sheetId,
                  dimension: 'ROWS',
                  length: rowsToAdd,
                },
              },
            ],
          }),
        })
      }
    } catch {
      // Non-fatal if gridProperties inspection is unavailable
    }
  }

  /**
   * Reads Column A to determine the next available contiguous row and MAX(ID) + 1,
   * ignoring any stray footer rows / formulas after blank gaps, and writes disjoint ranges A..E and G..AB.
   */
  public async createLaptopRecord(
    draft: Omit<LaptopRecord, 'rowIndex' | 'id' | 'isCompleted'>,
    preferredNextRow?: number,
  ): Promise<LaptopRecord> {
    const colARange = encodeURIComponent(`'${REGISTRY_SHEET_NAME}'!A1:A2000`)
    const colAData = await this.requestJson<{ values?: unknown[][] }>(
      `/values/${colARange}?valueRenderOption=UNFORMATTED_VALUE`,
    )
    const rows = colAData.values ?? [['ID']]
    let maxId = 0
    let lastPopulatedRowIndex = 1 // 1-based header row
    let consecutiveEmptyRows = 0

    for (let i = 1; i < rows.length; i += 1) {
      const cellVal = rows[i]?.[0]
      const idStr = normalizeIntegerString(cellVal)
      const isInteger = /^\d+$/.test(idStr)
      const num = isInteger ? Number.parseInt(idStr, 10) : NaN

      if (!Number.isNaN(num) && num > 0) {
        if (num > maxId) maxId = num
        lastPopulatedRowIndex = i + 1
        consecutiveEmptyRows = 0
      } else {
        consecutiveEmptyRows += 1
        // After encountering CONSECUTIVE_EMPTY_ROWS_THRESHOLD empty rows after populated records, stop scanning
        if (
          consecutiveEmptyRows >= CONSECUTIVE_EMPTY_ROWS_THRESHOLD &&
          lastPopulatedRowIndex > 1
        ) {
          break
        }
      }
    }

    let nextRowIndex = lastPopulatedRowIndex + 1
    // If a valid preferredNextRow is provided and is contiguous with records, use it
    if (
      preferredNextRow &&
      preferredNextRow > 1 &&
      (preferredNextRow === nextRowIndex || preferredNextRow <= lastPopulatedRowIndex + 1)
    ) {
      nextRowIndex = preferredNextRow
    }

    const nextId = maxId + 1
    const newRecord: LaptopRecord = {
      ...draft,
      rowIndex: nextRowIndex,
      id: nextId,
      isCompleted: Boolean(draft.issuedAt),
    }

    await this.ensureGridCapacity(nextRowIndex)

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

  /**
   * Deletes the row corresponding to `record` from 'Список звітності' via deleteDimension (ROWS).
   * Verifies the row ID matches beforehand; scans Column A if row index shifted.
   * If the first data row (row 2) is deleted, restores the Column F array formula in F2.
   */
  public async deleteLaptopRecord(record: LaptopRecord): Promise<void> {
    let targetRow = record.rowIndex
    const idCheckRange = encodeURIComponent(`'${REGISTRY_SHEET_NAME}'!A${targetRow}`)
    const idCheck = await this.requestJson<{ values?: unknown[][] }>(
      `/values/${idCheckRange}?valueRenderOption=UNFORMATTED_VALUE`,
    )
    const actualIdStr = normalizeIntegerString(idCheck.values?.[0]?.[0])
    const actualId = Number.parseInt(actualIdStr, 10)

    if (actualId !== record.id) {
      const colARange = encodeURIComponent(`'${REGISTRY_SHEET_NAME}'!A1:A2000`)
      const colAData = await this.requestJson<{ values?: unknown[][] }>(
        `/values/${colARange}?valueRenderOption=UNFORMATTED_VALUE`,
      )
      const rows = colAData.values ?? []
      let foundRow = -1
      for (let i = 1; i < rows.length; i += 1) {
        if (Number.parseInt(normalizeIntegerString(rows[i]?.[0]), 10) === record.id) {
          foundRow = i + 1
          break
        }
      }
      if (foundRow === -1) {
        throw new Error(`Картку з ID #${record.id} не знайдено в таблиці Google Sheets`)
      }
      targetRow = foundRow
    }

    const sheetId = await this.getRegistrySheetId()

    await this.requestJson(':batchUpdate', {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: targetRow - 1,
                endIndex: targetRow,
              },
            },
          },
        ],
      }),
    })

    if (targetRow === 2) {
      await this.requestJson(
        `/values/${encodeURIComponent(`'${REGISTRY_SHEET_NAME}'!F2`)}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          body: JSON.stringify({
            range: `'${REGISTRY_SHEET_NAME}'!F2`,
            values: [
              ['=IF(ROW(C2:C1024)<=MAX(ROW(C2:C1024)*(C2:C1024<>"")), C2:C1024<>"", "")'],
            ],
          }),
        },
      ).catch(() => {
        // Non-blocking if F2 restore fails
      })
    }
  }

  /**
   * Appends a new unique value to a column in '_списки' (e.g. Column E for 'Підрозділ').
   */
  public async appendDictionaryValue(
    columnLetter: string,
    value: string,
    sheetName: string = '_списки',
  ): Promise<void> {
    const trimmed = value.trim()
    if (!trimmed) {
      return
    }

    const rangeParam = encodeURIComponent(`'${sheetName}'!${columnLetter}1:${columnLetter}100`)
    const colData = await this.requestJson<{ values?: unknown[][] }>(
      `/values/${rangeParam}?valueRenderOption=UNFORMATTED_VALUE`,
    )
    const rows = colData.values ?? []

    // Check if already present (case-insensitive)
    const exists = rows.slice(1).some((r) => {
      const cellText = String(r?.[0] ?? '').trim()
      return cellText.toLowerCase() === trimmed.toLowerCase()
    })
    if (exists) {
      return
    }

    let lastPopulatedRow = 1
    for (let i = 1; i < rows.length; i += 1) {
      const cell = rows[i]?.[0]
      if (cell !== undefined && cell !== null && String(cell).trim() !== '') {
        lastPopulatedRow = i + 1
      }
    }

    const nextRow = lastPopulatedRow + 1
    const targetCellRange = `'${sheetName}'!${columnLetter}${nextRow}`
    await this.requestJson(
      `/values/${encodeURIComponent(targetCellRange)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        body: JSON.stringify({
          range: targetCellRange,
          values: [[sanitizeFormulaTrigger(trimmed)]],
        }),
      },
    )
  }
}

