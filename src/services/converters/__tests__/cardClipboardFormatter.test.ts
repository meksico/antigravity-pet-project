import { describe, expect, it } from 'vitest'
import { formatCardClipboardText } from '../cardClipboardFormatter'

describe('Card Clipboard Formatter', () => {
  it('formats card attributes matching the user specified template exactly', () => {
    const card = {
      localNetwork: 'ІСД-Інтернет',
      hostname: 'DESKTOP-TNFQN4E',
      wifiMac: '04:F0:EE:D5:B8:FD',
      esetInstanceId: '8f2d2bca-4229-4f34-a607-e4743ba4b5ce',
      militaryUnit: 'A0932',
      responsibleRank: 'Солдат',
      responsibleName: 'Бугаенко Елена',
      responsiblePhone: '0686401606',
      infosecRank: 'Старший лейтенант',
      infosecName: 'Романенко А.О.',
      infosecPhone: '0679900750',
    }

    const expected = [
      'Мережа: ІСД-Інтернет',
      "Ім'я комп'ютера: DESKTOP-TNFQN4E",
      '04:F0:EE:D5:B8:FD',
      'ProductInstanceID: 8f2d2bca-4229-4f34-a607-e4743ba4b5ce',
      'Військова частина: A0932',
      'Користувач АРМ: Солдат Бугаенко Елена 0686401606',
      'НСЗІ Старший лейтенант Романенко А.О. 0679900750',
    ].join('\n')

    expect(formatCardClipboardText(card)).toBe(expected)
  })

  it('falls back to network when localNetwork is missing, and provides dashes for empty fields', () => {
    const emptyCard = {
      network: 'Інтернет',
    }

    const expected = [
      'Мережа: Інтернет',
      "Ім'я комп'ютера: —",
      '—',
      'ProductInstanceID: —',
      'Військова частина: —',
      'Користувач АРМ: —',
      'НСЗІ —',
    ].join('\n')

    expect(formatCardClipboardText(emptyCard)).toBe(expected)
  })

  it('handles partial user and infosec information gracefully', () => {
    const partialCard = {
      localNetwork: 'ЗСУ 002',
      hostname: 'DESKTOP-TEST',
      wifiMac: 'AA:BB:CC:DD:EE:FF',
      esetInstanceId: '12345678-1234-1234-1234-123456789abc',
      militaryUnit: 'A1111',
      responsibleName: 'Іванов І.І.',
      infosecName: 'Петров П.П.',
    }

    const expected = [
      'Мережа: ЗСУ 002',
      "Ім'я комп'ютера: DESKTOP-TEST",
      'AA:BB:CC:DD:EE:FF',
      'ProductInstanceID: 12345678-1234-1234-1234-123456789abc',
      'Військова частина: A1111',
      'Користувач АРМ: Іванов І.І.',
      'НСЗІ Петров П.П.',
    ].join('\n')

    expect(formatCardClipboardText(partialCard)).toBe(expected)
  })
})
