/**
 * Data hygiene normalizers for Google Sheets cells in 'Список звітності' (AC-002, ADR-0003).
 * All functions are pure and immutable.
 */

/**
 * Strips trailing ".0" / ".00" from float-formatted integer strings (e.g. "8.0" -> "8", "27.0" -> "27").
 */
export function normalizeIntegerString(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  const trimmed = String(value).trim()
  if (!trimmed) {
    return ''
  }
  if (/^\d+\.0+$/.test(trimmed)) {
    return trimmed.replace(/\.0+$/, '')
  }
  return trimmed
}

/**
 * Normalizes MAC addresses from hyphen-separated (08-B4-D2-56-F0-90),
 * Cisco dot-separated (1413.3303.4af3), or raw 12-char hex into uppercase XX:XX:XX:XX:XX:XX.
 */
export function normalizeMacAddress(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  const trimmed = String(value).trim()
  if (!trimmed) {
    return ''
  }
  const hexOnly = trimmed.replace(/[^a-fA-F0-9]/g, '').toUpperCase()
  if (hexOnly.length === 12) {
    const pairs = hexOnly.match(/.{1,2}/g)
    return pairs ? pairs.join(':') : trimmed.toUpperCase()
  }
  return trimmed.toUpperCase()
}

/**
 * Checks whether a MAC address matches a search query regardless of separators
 * (e.g. ':', '-', '.', spaces, underscores, or no separators at all).
 * Supports full MAC, prefixes, suffixes, and hex fragments.
 */
export function matchesMacSearch(macAddress: string | null | undefined, query: string): boolean {
  if (!macAddress || !query) return false

  const rawMac = macAddress.replace(/[^a-fA-F0-9]/g, '').toLowerCase()
  if (!rawMac) return false

  const rawQuery = query.trim().toLowerCase()
  if (!rawQuery) return false

  // 1. Direct substring match on original representation (e.g. exact "00:1a:2b")
  if (macAddress.toLowerCase().includes(rawQuery)) {
    return true
  }

  // MAC queries must strictly consist of hexadecimal characters and valid MAC separators
  if (!/^[0-9a-f:\-.\s_/]+$/i.test(rawQuery)) {
    return false
  }

  const hexQuery = rawQuery.replace(/[^a-f0-9]/g, '')

  // 2. Full 12-char MAC match regardless of separators
  if (hexQuery.length === 12) {
    return rawMac === hexQuery
  }

  // 3. Fragment matching requires at least 4 hex characters (2 octets) and at most 12 characters
  if (hexQuery.length >= 4 && hexQuery.length <= 12) {
    return rawMac.includes(hexQuery)
  }

  return false
}

/**
 * Harmonizes Russian/mixed spelling in Column Z ('Мережа локальна') to canonical Ukrainian.
 */
export function normalizeLocalNetwork(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  const trimmed = String(value).trim()
  if (!trimmed) {
    return ''
  }
  if (trimmed.toLowerCase() === 'ісд-интернет' || trimmed.toLowerCase() === 'исд-интернет') {
    return 'ІСД-Інтернет'
  }
  return trimmed
}

/**
 * Coerces mixed truthy sheet values ("true", "TRUE", "1", 1, true, "так") into boolean.
 */
export function normalizeBooleanCell(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'number') {
    return value === 1
  }
  if (value === null || value === undefined) {
    return false
  }
  const normalized = String(value).trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'так' || normalized === 'yes'
}

/**
 * Normalizes Ukrainian phone numbers to 10-digit national format (0XXXXXXXXX) when possible.
 */
export function normalizePhone(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  const trimmed = String(value).trim()
  if (!trimmed) {
    return ''
  }
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('380')) {
    return digits.slice(2)
  }
  if (digits.length === 10 && digits.startsWith('0')) {
    return digits
  }
  return trimmed
}

/**
 * Normalizes ESET ProductInstanceID UUID to lowercase trimmed string.
 */
export function normalizeEsetUuid(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value).trim().toLowerCase()
}

/**
 * Prevents Google Sheets / CSV Formula Injection (CWE-1236) by prefixing strings
 * that start with formula trigger characters (=, +, -, @, \t, \r) with a single quote (').
 */
export function sanitizeFormulaTrigger(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) {
    return `'${value}`
  }
  return value
}


