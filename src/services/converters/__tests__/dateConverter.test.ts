import { describe, expect, it } from 'vitest'
import {
  formatDisplayDateTime,
  isoToSerialDate,
  parseSheetDateCell,
  serialDateToIso,
} from '../dateConverter'

describe('Google Sheets Serial Date Converter', () => {
  it('converts Google Sheets serial date numbers to ISO 8601 and back losslessly', () => {
    const serial = 46309.42361111111
    const iso = serialDateToIso(serial)
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)

    const roundTrip = isoToSerialDate(iso)
    expect(Math.abs(roundTrip - serial)).toBeLessThan(0.001)
  })

  it('parses numeric strings, numbers, and ISO strings from sheet cells', () => {
    expect(parseSheetDateCell('46309.42361111111')).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(parseSheetDateCell(46311.68125)).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(parseSheetDateCell('2026-10-14T10:10:00.000Z')).toBe('2026-10-14T10:10:00.000Z')
    expect(parseSheetDateCell('')).toBeNull()
    expect(parseSheetDateCell(null)).toBeNull()
  })

  it('throws on invalid serial numbers or invalid ISO strings', () => {
    expect(() => serialDateToIso(-1)).toThrow()
    expect(() => isoToSerialDate('not-a-date')).toThrow()
  })

  it('formats ISO date strings for display and handles null gracefully', () => {
    expect(formatDisplayDateTime(null)).toBe('—')
    expect(formatDisplayDateTime('')).toBe('—')
    const formatted = formatDisplayDateTime('2026-10-14T10:10:00.000Z')
    expect(formatted).toContain('2026')
  })
})

