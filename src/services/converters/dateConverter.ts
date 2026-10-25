/**
 * Google Sheets / Excel serial date converter (Epoch: 1899-12-30 UTC).
 */

const SHEETS_EPOCH_MS = Date.UTC(1899, 11, 30)
const MS_PER_DAY = 86_400_000

/**
 * Converts a Google Sheets serial date number (e.g. 46309.42361111111) into an ISO 8601 string.
 */
export function serialDateToIso(serial: number): string {
  if (typeof serial !== 'number' || Number.isNaN(serial) || serial <= 0) {
    throw new Error(`Invalid Google Sheets serial date: ${String(serial)}`)
  }
  const utcMs = Math.round(SHEETS_EPOCH_MS + serial * MS_PER_DAY)
  return new Date(utcMs).toISOString()
}

/**
 * Converts an ISO 8601 date string into a Google Sheets serial date number.
 */
export function isoToSerialDate(isoString: string): number {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ISO date string: ${isoString}`)
  }
  const serial = (date.getTime() - SHEETS_EPOCH_MS) / MS_PER_DAY
  return Math.round(serial * 1e8) / 1e8
}

/**
 * Parses a raw Google Sheets cell (serial number, numeric string, or ISO string) into an ISO 8601 string or null.
 */
export function parseSheetDateCell(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'number') {
    return value > 0 ? serialDateToIso(value) : null
  }
  const trimmed = String(value).trim()
  if (!trimmed) {
    return null
  }
  const asNum = Number(trimmed)
  if (!Number.isNaN(asNum) && asNum > 20000 && asNum < 100000) {
    return serialDateToIso(asNum)
  }
  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString()
  }
  return null
}

/**
 * Formats an ISO 8601 timestamp for human display in uk-UA locale.
 */
export function formatDisplayDateTime(isoString: string | null | undefined): string {
  if (!isoString) {
    return '—'
  }
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) {
    return isoString
  }
  return new Intl.DateTimeFormat('uk-UA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

