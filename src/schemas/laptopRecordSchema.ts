import { z } from 'zod'
import { parseSheetDateCell } from '../services/converters/dateConverter'
import {
  normalizeBooleanCell,
  normalizeEsetUuid,
  normalizeIntegerString,
  normalizeLocalNetwork,
  normalizeMacAddress,
  normalizePhone,
} from '../services/converters/normalizers'

/**
 * 28-Column Master Registry Schema ('Список звітності' columns A..AB)
 */
export const laptopRecordSchema = z.object({
  rowIndex: z.number().int().min(2),
  id: z.number().int().positive(), // A: ID
  receivedAt: z.string().min(1), // B: Дата/час прийняття
  issuedAt: z.string().nullable(), // C: Дата/час видачі
  issuedToName: z.string().nullable(), // D: Видано ФІО
  issuedToPhone: z.string().nullable(), // E: Видано тел.
  isCompleted: z.boolean(), // F: _isCompleted (formula-driven)
  subdivision: z.string(), // G: Підрозділ
  location: z.string(), // H: Місцезнаходження
  peomDescription: z.string(), // I: Опис ПЕОМ
  network: z.string(), // J: Мережа
  updateType: z.string(), // K: Тип оновлення
  securityClassification: z.string(), // L: ГОД
  inventoryNumber: z.string(), // M: Инв.н.
  asType: z.string(), // N: Тип АС
  responsibleName: z.string(), // O: Відповідальний
  responsibleRank: z.string(), // P: Звання відповідального
  responsiblePhone: z.string(), // Q: Тел. відповідального
  hostname: z.string(), // R: Імʼя ПЕОМ
  wifiMac: z.string(), // S: WiFi MAC
  esetInstanceId: z.string(), // T: ESET ProductInstanceID
  militaryUnit: z.string(), // U: Військова частина
  infosecRank: z.string(), // V: НСЗІ звання
  infosecName: z.string(), // W: НСЗІ ФІО
  infosecPhone: z.string(), // X: НСЗІ тел
  policy: z.string(), // Y: Політика
  localNetwork: z.string(), // Z: Мережа локальна
  checklistCompleted: z.boolean(), // AA: Чек-ліст інсталляціі
  createdBy: z.string(), // AB: CreatedBy
})

export type LaptopRecord = z.infer<typeof laptopRecordSchema>

/**
 * Intake Form Schema for creating a new laptop record (AC-006)
 */
export const intakeFormSchema = z.object({
  receivedAt: z.string().min(1, 'Вкажіть дату та час прийняття'),
  subdivision: z.string().min(1, 'Оберіть підрозділ'),
  location: z.string().min(1, 'Оберіть місцезнаходження'),
  peomDescription: z.string().min(1, 'Оберіть опис ПЕОМ'),
  network: z.string().min(1, 'Оберіть мережу'),
  updateType: z.string().min(1, 'Оберіть тип оновлення'),
  securityClassification: z.string().min(1, 'Оберіть ГОД'),
  inventoryNumber: z
    .string()
    .transform((v) => normalizeIntegerString(v))
    .refine((v) => v.length > 0, 'Введіть інвентарний номер'),
  asType: z.string().min(1, 'Оберіть тип АС'),
  responsibleName: z.string().trim().min(2, 'Вкажіть ПІБ відповідального'),
  responsibleRank: z.string().trim().min(1, 'Вкажіть звання відповідального'),
  responsiblePhone: z.string().transform((v) => normalizePhone(v)),
  hostname: z.string().trim().min(2, 'Вкажіть імʼя ПЕОМ (напр. DESKTOP-XXXXXXX)'),
  wifiMac: z
    .string()
    .transform((v) => normalizeMacAddress(v))
    .refine(
      (v) => v === '' || /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(v),
      'Невірний формат WiFi MAC (очікується XX:XX:XX:XX:XX:XX)',
    ),
  esetInstanceId: z
    .string()
    .transform((v) => normalizeEsetUuid(v))
    .refine(
      (v) => v === '' || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v),
      'ESET ProductInstanceID має бути у форматі UUID',
    ),
  militaryUnit: z.string().min(1, 'Вкажіть військову частину'),
  infosecRank: z.string().trim().min(1, 'Вкажіть звання НСЗІ'),
  infosecName: z.string().trim().min(2, 'Вкажіть ФІО НСЗІ'),
  infosecPhone: z.string().transform((v) => normalizePhone(v)),
  policy: z.string().min(1, 'Оберіть політику безпеки'),
  localNetwork: z.string().transform((v) => normalizeLocalNetwork(v)),
  checklistCompleted: z.boolean().default(false),
  createdBy: z.string().email('Невірний email оператора'),
})

export type IntakeFormData = z.infer<typeof intakeFormSchema>

/**
 * Handover Form Schema for issuing a laptop (AC-008)
 */
export const handoverFormSchema = z.object({
  issuedAt: z.string().min(1, 'Вкажіть дату та час видачі'),
  issuedToName: z.string().trim().min(2, 'Вкажіть ПІБ отримувача'),
  issuedToPhone: z
    .string()
    .transform((v) => normalizePhone(v))
    .refine((v) => v.length >= 9, 'Вкажіть коректний номер телефону отримувача'),
})

export type HandoverFormData = z.infer<typeof handoverFormSchema>

/**
 * Parses a single raw row from 'Список звітності' (columns A..AB) into a normalized LaptopRecord.
 */
export function parseSheetRowToLaptopRecord(
  rawRow: unknown[],
  rowIndex: number,
): LaptopRecord | null {
  if (!Array.isArray(rawRow) || rawRow.length === 0) {
    return null
  }
  const rawId = normalizeIntegerString(rawRow[0])
  const parsedId = Number.parseInt(rawId, 10)
  if (Number.isNaN(parsedId) || parsedId <= 0) {
    return null
  }

  const receivedAt = parseSheetDateCell(rawRow[1]) ?? new Date(0).toISOString()
  const issuedAt = parseSheetDateCell(rawRow[2])
  const issuedToName = rawRow[3] ? String(rawRow[3]).trim() || null : null
  const issuedToPhone = rawRow[4] ? normalizePhone(rawRow[4]) || null : null

  // _isCompleted (Col F) is true whenever issuedAt (Col C) is populated or Col F is truthy
  const isCompleted = Boolean(issuedAt) || normalizeBooleanCell(rawRow[5])

  const candidate = {
    rowIndex,
    id: parsedId,
    receivedAt,
    issuedAt,
    issuedToName,
    issuedToPhone,
    isCompleted,
    subdivision: String(rawRow[6] ?? '').trim(),
    location: String(rawRow[7] ?? '').trim(),
    peomDescription: String(rawRow[8] ?? '').trim(),
    network: String(rawRow[9] ?? '').trim(),
    updateType: String(rawRow[10] ?? '').trim(),
    securityClassification: String(rawRow[11] ?? '').trim(),
    inventoryNumber: normalizeIntegerString(rawRow[12]),
    asType: String(rawRow[13] ?? '').trim(),
    responsibleName: String(rawRow[14] ?? '').trim(),
    responsibleRank: String(rawRow[15] ?? '').trim(),
    responsiblePhone: normalizePhone(rawRow[16]),
    hostname: String(rawRow[17] ?? '').trim(),
    wifiMac: normalizeMacAddress(rawRow[18]),
    esetInstanceId: normalizeEsetUuid(rawRow[19]),
    militaryUnit: String(rawRow[20] ?? '').trim(),
    infosecRank: String(rawRow[21] ?? '').trim(),
    infosecName: String(rawRow[22] ?? '').trim(),
    infosecPhone: normalizePhone(rawRow[23]),
    policy: String(rawRow[24] ?? '').trim(),
    localNetwork: normalizeLocalNetwork(rawRow[25]),
    checklistCompleted: normalizeBooleanCell(rawRow[26]),
    createdBy: String(rawRow[27] ?? '').trim(),
  }

  const validated = laptopRecordSchema.safeParse(candidate)
  return validated.success ? validated.data : null
}

/**
 * Reference Dictionaries from '_списки' (Columns A..I)
 */
export interface ReferenceDictionaries {
  networks: string[] // A: Мережа
  updateTypes: string[] // B: Тип оновлення
  securityClassifications: string[] // C: ГОД
  asTypes: string[] // D: Тип АС
  subdivisions: string[] // E: Підрозділ
  locations: string[] // F: Місцезнаходження
  peomDescriptions: string[] // G: Опис ПЕОМ
  militaryUnits: string[] // H: Військова частина
  policies: string[] // I: Політика
}

export function parseDictionariesSheet(rawRows: unknown[][]): ReferenceDictionaries {
  const extractColumn = (colIndex: number): string[] => {
    const values: string[] = []
    // Skip row 0 (header row)
    for (let r = 1; r < rawRows.length; r += 1) {
      const cell = rawRows[r]?.[colIndex]
      const text = cell !== undefined && cell !== null ? String(cell).trim() : ''
      if (text && !values.includes(text)) {
        values.push(text)
      }
    }
    return values
  }

  return {
    networks: extractColumn(0),
    updateTypes: extractColumn(1),
    securityClassifications: extractColumn(2),
    asTypes: extractColumn(3),
    subdivisions: extractColumn(4),
    locations: extractColumn(5),
    peomDescriptions: extractColumn(6),
    militaryUnits: extractColumn(7),
    policies: extractColumn(8),
  }
}

/**
 * 27-Step Hardening Checklist Item ('Чек-ліст!A1:A27')
 */
export interface ChecklistStepItem {
  stepNumber: number
  title: string
  category: string
}

function inferChecklistCategory(stepNumber: number): string {
  if (stepNumber === 1 || stepNumber === 25) return 'Конфіденційність та телеметрія'
  if (stepNumber === 2 || stepNumber === 23 || stepNumber === 24) return 'Облікові записи'
  if (stepNumber >= 3 && stepNumber <= 8) return 'Локалізація та мовні пакети'
  if (stepNumber >= 9 && stepNumber <= 11) return 'Видалення стороннього ПЗ (HP Wolf)'
  if (stepNumber >= 12 && stepNumber <= 15) return 'Базове прикладне ПЗ'
  if (stepNumber >= 16 && stepNumber <= 22) return 'Антивірусний захист (ESET) та оновлення'
  return 'Фіналізація та маркування'
}

/**
 * Parses ONLY Column A (index 0) from 'Чек-ліст' to prevent leaking any Column B notes.
 */
export function parseChecklistSheet(rawRows: unknown[][]): ChecklistStepItem[] {
  const steps: ChecklistStepItem[] = []
  for (let i = 0; i < rawRows.length; i += 1) {
    const colA = rawRows[i]?.[0]
    const title = colA !== undefined && colA !== null ? String(colA).trim() : ''
    if (title) {
      const stepNumber = steps.length + 1
      steps.push({
        stepNumber,
        title,
        category: inferChecklistCategory(stepNumber),
      })
    }
  }
  return steps
}

