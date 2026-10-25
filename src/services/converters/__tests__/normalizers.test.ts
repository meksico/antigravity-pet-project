import { describe, expect, it } from 'vitest'
import {
  normalizeBooleanCell,
  normalizeEsetUuid,
  normalizeIntegerString,
  normalizeLocalNetwork,
  normalizeMacAddress,
  normalizePhone,
  sanitizeFormulaTrigger,
} from '../normalizers'

describe('Data Hygiene Normalizers (AC-002)', () => {
  describe('normalizeIntegerString', () => {
    it('strips trailing .0 from float-formatted integer strings', () => {
      expect(normalizeIntegerString('8.0')).toBe('8')
      expect(normalizeIntegerString('27.0')).toBe('27')
      expect(normalizeIntegerString('105.00')).toBe('105')
    })

    it('preserves clean integers and numeric inputs', () => {
      expect(normalizeIntegerString(18)).toBe('18')
      expect(normalizeIntegerString('35')).toBe('35')
    })

    it('preserves non-numeric inventory codes and trims whitespace', () => {
      expect(normalizeIntegerString('  INV-42A  ')).toBe('INV-42A')
      expect(normalizeIntegerString(null)).toBe('')
      expect(normalizeIntegerString(undefined)).toBe('')
    })
  })

  describe('normalizeMacAddress', () => {
    it('converts hyphen-separated MAC addresses to uppercase colon-separated format', () => {
      expect(normalizeMacAddress('08-b4-d2-56-f0-90')).toBe('08:B4:D2:56:F0:90')
    })

    it('preserves valid colon-separated MAC addresses and normalizes case', () => {
      expect(normalizeMacAddress('80:13:16:7d:48:3a')).toBe('80:13:16:7D:48:3A')
    })

    it('normalizes Cisco dot-separated or raw 12-hex-char MAC addresses', () => {
      expect(normalizeMacAddress('1413.3303.4af3')).toBe('14:13:33:03:4A:F3')
      expect(normalizeMacAddress('8013167C0759')).toBe('80:13:16:7C:07:59')
    })

    it('returns empty string for empty input and trimmed upper string if invalid length', () => {
      expect(normalizeMacAddress('')).toBe('')
      expect(normalizeMacAddress('   ')).toBe('')
      expect(normalizeMacAddress('INVALID-MAC')).toBe('INVALID-MAC')
    })
  })

  describe('normalizeLocalNetwork', () => {
    it('harmonizes Russian spelling ІСД-Интернет to Ukrainian ІСД-Інтернет', () => {
      expect(normalizeLocalNetwork('ІСД-Интернет')).toBe('ІСД-Інтернет')
      expect(normalizeLocalNetwork('  ІСД-Интернет  ')).toBe('ІСД-Інтернет')
    })

    it('preserves canonical Ukrainian network names', () => {
      expect(normalizeLocalNetwork('ІСД-Інтернет')).toBe('ІСД-Інтернет')
      expect(normalizeLocalNetwork('АС-1 Локальна')).toBe('АС-1 Локальна')
    })
  })

  describe('normalizeBooleanCell', () => {
    it('coerces "true", "TRUE", "1", 1, and true to boolean true', () => {
      expect(normalizeBooleanCell('true')).toBe(true)
      expect(normalizeBooleanCell('TRUE')).toBe(true)
      expect(normalizeBooleanCell('1')).toBe(true)
      expect(normalizeBooleanCell(1)).toBe(true)
      expect(normalizeBooleanCell(true)).toBe(true)
      expect(normalizeBooleanCell('так')).toBe(true)
    })

    it('coerces "false", "0", 0, false, null, and empty string to false', () => {
      expect(normalizeBooleanCell('false')).toBe(false)
      expect(normalizeBooleanCell('0')).toBe(false)
      expect(normalizeBooleanCell(0)).toBe(false)
      expect(normalizeBooleanCell(false)).toBe(false)
      expect(normalizeBooleanCell('')).toBe(false)
      expect(normalizeBooleanCell(null)).toBe(false)
    })
  })

  describe('normalizePhone', () => {
    it('normalizes Ukrainian phone numbers consistently', () => {
      expect(normalizePhone('099 000-00-01')).toBe('0990000001')
      expect(normalizePhone('+38 (099) 000-00-01')).toBe('0990000001')
      expect(normalizePhone('380990000001')).toBe('0990000001')
      expect(normalizePhone('')).toBe('')
    })
  })

  describe('normalizeEsetUuid', () => {
    it('normalizes UUID to lowercase and trims whitespace', () => {
      expect(normalizeEsetUuid('  91481368-CC47-43AD-AB55-9151CA09EEF2 ')).toBe(
        '91481368-cc47-43ad-ab55-9151ca09eef2',
      )
      expect(normalizeEsetUuid('')).toBe('')
    })
  })

  describe('sanitizeFormulaTrigger', () => {
    it('prefixes formula injection triggers (=, +, -, @, \\t, \\r) with an apostrophe (CWE-1236)', () => {
      expect(sanitizeFormulaTrigger('=HYPERLINK("http://evil.example")')).toBe(
        '\'=HYPERLINK("http://evil.example")',
      )
      expect(sanitizeFormulaTrigger('+380991112233')).toBe("'+380991112233")
      expect(sanitizeFormulaTrigger('-cmd')).toBe("'-cmd")
      expect(sanitizeFormulaTrigger('@SUM(A1:A2)')).toBe("'@SUM(A1:A2)")
      expect(sanitizeFormulaTrigger('DESKTOP-DEMO101')).toBe('DESKTOP-DEMO101')
    })
  })
})

