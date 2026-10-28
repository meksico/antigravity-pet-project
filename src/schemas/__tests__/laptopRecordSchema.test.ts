import { describe, expect, it } from 'vitest'
import {
  handoverFormSchema,
  intakeFormSchema,
  parseChecklistSheet,
  parseDictionariesSheet,
  parseSheetRowToLaptopRecord,
} from '../laptopRecordSchema'

describe('28-Column Laptop Record Schema & Sheet Parsers (AC-002, AC-004, AC-007)', () => {
  it('parses a raw 28-column row with legacy formatting anomalies into a normalized LaptopRecord', () => {
    const rawRow = [
      '8.0', // A: ID (float string)
      '46309.67152777778', // B: Дата/час прийняття (serial)
      '46311.68125', // C: Дата/час видачі (serial)
      'Коваленко І.І.', // D: Видано ФІО (synthetic)
      '+38 (099) 111-22-33', // E: Видано тел.
      '1', // F: _isCompleted
      'САДн', // G: Підрозділ
      'ППД', // H: Місцезнаходження
      'Робочий', // I: Опис ПЕОМ
      'Інтернет', // J: Мережа
      'Автоматично (Інтернет)', // K: Тип оновлення
      'НТ', // L: ГОД
      '27.0', // M: Инв.н. (float string)
      'ІСД-І', // N: Тип АС
      'Петренко П.П.', // O: Відповідальний (synthetic)
      'солдат', // P: Звання відповідального
      '099 222 33 44', // Q: Тел. відповідального
      'DESKTOP-DEMO01', // R: Імʼя ПЕОМ
      '08-b4-d2-56-f0-90', // S: WiFi MAC (hyphenated lowercase)
      '45D0FBDF-EBBB-4F11-9182-540AE02C4E8E', // T: ESET ProductInstanceID (uppercase)
      'A0000', // U: Військова частина (synthetic)
      'лейтенант', // V: НСЗІ звання
      'Сидоренко С.С.', // W: НСЗІ ФІО (synthetic)
      '0993334455', // X: НСЗІ тел
      'AC-3 Light (тільки парольна політика)', // Y: Політика
      'ІСД-Интернет', // Z: Мережа локальна (Russian spelling)
      '1', // AA: Чек-ліст інсталляціі
      'operator@example.org', // AB: CreatedBy
    ]

    const record = parseSheetRowToLaptopRecord(rawRow, 5)
    expect(record).not.toBeNull()
    expect(record?.rowIndex).toBe(5)
    expect(record?.id).toBe(8)
    expect(record?.inventoryNumber).toBe('27')
    expect(record?.wifiMac).toBe('08:B4:D2:56:F0:90')
    expect(record?.esetInstanceId).toBe('45d0fbdf-ebbb-4f11-9182-540ae02c4e8e')
    expect(record?.localNetwork).toBe('ІСД-Інтернет')
    expect(record?.checklistCompleted).toBe(true)
    expect(record?.isCompleted).toBe(true)
    expect(record?.issuedToPhone).toBe('0991112233')
    expect(record?.responsiblePhone).toBe('0992223344')
  })

  it('derives isCompleted = false when issuedAt (Col C) is empty', () => {
    const rawRow = [
      '10',
      '46309.5',
      '', // C: empty issuedAt
      '',
      '',
      '', // F: empty _isCompleted
      'Штаб',
      'ППД',
      'Робочий',
      'Інтернет',
      'Автоматично (Інтернет)',
      'НТ',
      '100',
      'ІСД-І',
      'Іваненко І.І.',
      'солдат',
      '0990001122',
      'DESKTOP-DEMO02',
      '',
      '',
      'A0000',
      'лейтенант',
      'Сидоренко С.С.',
      '0993334455',
      'АС-1',
      'ІСД-Інтернет',
      '',
      'operator@example.org',
    ]

    const record = parseSheetRowToLaptopRecord(rawRow, 6)
    expect(record?.isCompleted).toBe(false)
    expect(record?.checklistCompleted).toBe(false)
  })

  it('validates intakeFormSchema and handoverFormSchema', () => {
    const validIntake = intakeFormSchema.safeParse({
      receivedAt: '2026-10-25T12:00:00.000Z',
      subdivision: 'САДн',
      location: 'ППД',
      peomDescription: 'Робочий',
      network: 'Інтернет',
      updateType: 'Автоматично (Інтернет)',
      securityClassification: 'НТ',
      inventoryNumber: '42.0',
      asType: 'ІСД-І',
      responsibleName: 'Петренко П.П.',
      responsibleRank: 'солдат',
      responsiblePhone: '0991234567',
      hostname: 'DESKTOP-NEW01',
      wifiMac: 'aa-bb-cc-dd-ee-ff',
      esetInstanceId: '91481368-cc47-43ad-ab55-9151ca09eef2',
      militaryUnit: 'A0000',
      infosecRank: 'старший лейтенант',
      infosecName: 'Сидоренко С.С.',
      infosecPhone: '0997654321',
      policy: 'AC-3 Light (тільки парольна політика)',
      localNetwork: 'ІСД-Интернет',
      checklistCompleted: false,
      createdBy: 'operator@example.org',
    })
    expect(validIntake.success).toBe(true)
    if (validIntake.success) {
      expect(validIntake.data.inventoryNumber).toBe('42')
      expect(validIntake.data.wifiMac).toBe('AA:BB:CC:DD:EE:FF')
      expect(validIntake.data.localNetwork).toBe('ІСД-Інтернет')
    }

    const validHandover = handoverFormSchema.safeParse({
      issuedAt: '2026-10-25T15:30:00.000Z',
      issuedToName: 'Коваленко О.О.',
      issuedToPhone: '+380991112233',
    })
    expect(validHandover.success).toBe(true)
  })

  it('parses _списки 2D grid into 13 reference lookup lists including Column K (НСЗІ відповідальний ФІО), Column L (НСЗІ телефон), and Column M (Мережа локальна)', () => {
    const rawGrid = [
      [
        'Мережа',
        'Тип оновлення',
        'ГОД',
        'Тип АС',
        'Підрозділ',
        'Місцезнаходження',
        'Опис ПЕОМ',
        'Військова частина',
        'Політика',
        'Звання',
        'НСЗІ відповідальний ФІО',
        'НСЗІ телефон',
        'Мережа локальна',
      ],
      [
        'Без підключення',
        'Автоматично (Інтернет)',
        'Без обробки',
        'АС-1',
        'САДн',
        'ППД',
        'Робочий',
        'A0000',
        'АС-1',
        'Рекрут',
        'Романенко А.О.',
        '0679900750',
        'ІСД-Інтернет',
      ],
      [
        'Інтернет',
        'СЗІвАС',
        'НТ',
        'ІСД-І',
        'Штаб',
        '',
        '',
        '',
        'АС-2, 3',
        'Солдат',
        '',
        '',
        'АСУ-Дніпро',
      ],
    ]

    const dicts = parseDictionariesSheet(rawGrid)
    expect(dicts.networks).toEqual(['Без підключення', 'Інтернет'])
    expect(dicts.subdivisions).toEqual(['САДн', 'Штаб'])
    expect(dicts.militaryUnits).toEqual(['A0000'])
    expect(dicts.ranks).toEqual(['Рекрут', 'Солдат'])
    expect(dicts.infosecOfficers).toEqual(['Романенко А.О.'])
    expect(dicts.infosecPhones).toEqual(['0679900750'])
    expect(dicts.localNetworks).toEqual(['ІСД-Інтернет', 'АСУ-Дніпро'])
  })

  it('parses Чек-ліст Column A only across all 27 steps (ignoring any Column B values for security)', () => {
    const rawChecklist = Array.from({ length: 27 }, (_, idx) => [
      `Крок #${idx + 1}`,
      'SENSITIVE_NOTE_MUST_BE_IGNORED',
    ])

    const steps = parseChecklistSheet(rawChecklist)
    expect(steps).toHaveLength(27)
    expect(steps[1]?.category).toBe('Облікові записи')
    expect(steps[9]?.category).toBe('Видалення стороннього ПЗ (HP Wolf)')
    expect(steps[12]?.category).toBe('Базове прикладне ПЗ')
    expect(steps[18]?.category).toBe('Антивірусний захист (ESET) та оновлення')
    expect(steps[26]?.category).toBe('Фіналізація та маркування')
    expect(JSON.stringify(steps)).not.toContain('SENSITIVE_NOTE_MUST_BE_IGNORED')

    expect(parseSheetRowToLaptopRecord([], 2)).toBeNull()
    expect(parseSheetRowToLaptopRecord(['invalid-id'], 2)).toBeNull()
    expect(parseSheetRowToLaptopRecord(['12'], 2)?.id).toBe(12)
  })
})

