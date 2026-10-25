import type { LaptopRecord } from '../../schemas/laptopRecordSchema'
import { isoToSerialDate } from '../converters/dateConverter'
import {
  normalizeEsetUuid,
  normalizeIntegerString,
  normalizeLocalNetwork,
  normalizeMacAddress,
  normalizePhone,
  sanitizeFormulaTrigger,
} from '../converters/normalizers'

export interface DisjointValueRangePayload {
  range: string
  values: (string | number | boolean)[][]
}

export const REGISTRY_SHEET_NAME = 'Список звітності'

/**
 * Builds two disjoint A1 ranges for updating or inserting a row in 'Список звітності':
 *   1. 'Список звітності'!A{row}:E{row}  (Columns A..E)
 *   2. 'Список звітності'!G{row}:AB{row} (Columns G..AB)
 *
 * Column F ('_isCompleted') is intentionally skipped so that the array formula in cell F2
 * (`=IF(ROW(C2:C1024)<=MAX(ROW(C2:C1024)*(C2:C1024<>"")), C2:C1024<>"", "")`)
 * is never overwritten or broken by literal cell values (AC-003, ADR-0003).
 */
export function buildDisjointRowUpdatePayloads(
  record: LaptopRecord,
  sheetName: string = REGISTRY_SHEET_NAME,
): DisjointValueRangePayload[] {
  const row = record.rowIndex

  const rangeAEValues: (string | number | boolean)[] = [
    record.id,
    isoToSerialDate(record.receivedAt),
    record.issuedAt ? isoToSerialDate(record.issuedAt) : '',
    sanitizeFormulaTrigger(record.issuedToName ?? ''),
    record.issuedToPhone ? sanitizeFormulaTrigger(normalizePhone(record.issuedToPhone)) : '',
  ]

  const rangeGABValues: (string | number | boolean)[] = [
    sanitizeFormulaTrigger(record.subdivision),
    sanitizeFormulaTrigger(record.location),
    sanitizeFormulaTrigger(record.peomDescription),
    sanitizeFormulaTrigger(record.network),
    sanitizeFormulaTrigger(record.updateType),
    sanitizeFormulaTrigger(record.securityClassification),
    sanitizeFormulaTrigger(normalizeIntegerString(record.inventoryNumber)),
    sanitizeFormulaTrigger(record.asType),
    sanitizeFormulaTrigger(record.responsibleName),
    sanitizeFormulaTrigger(record.responsibleRank),
    sanitizeFormulaTrigger(normalizePhone(record.responsiblePhone)),
    sanitizeFormulaTrigger(record.hostname.trim()),
    sanitizeFormulaTrigger(normalizeMacAddress(record.wifiMac)),
    sanitizeFormulaTrigger(normalizeEsetUuid(record.esetInstanceId)),
    sanitizeFormulaTrigger(record.militaryUnit),
    sanitizeFormulaTrigger(record.infosecRank),
    sanitizeFormulaTrigger(record.infosecName),
    sanitizeFormulaTrigger(normalizePhone(record.infosecPhone)),
    sanitizeFormulaTrigger(record.policy),
    sanitizeFormulaTrigger(normalizeLocalNetwork(record.localNetwork)),
    record.checklistCompleted ? 'TRUE' : 'FALSE',
    sanitizeFormulaTrigger(record.createdBy.trim()),
  ]

  return [
    {
      range: `'${sheetName}'!A${row}:E${row}`,
      values: [rangeAEValues],
    },
    {
      range: `'${sheetName}'!G${row}:AB${row}`,
      values: [rangeGABValues],
    },
  ]
}

/**
 * Bundles multiple LaptopRecord updates into a flat array of disjoint range payloads
 * for a single `spreadsheets.values.batchUpdate` call (AC-009).
 */
export function buildBatchDisjointUpdatePayloads(
  records: readonly LaptopRecord[],
  sheetName: string = REGISTRY_SHEET_NAME,
): DisjointValueRangePayload[] {
  return records.flatMap((record) => buildDisjointRowUpdatePayloads(record, sheetName))
}

