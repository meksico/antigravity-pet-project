import { describe, expect, it } from 'vitest'
import {
  buildBatchDisjointUpdatePayloads,
  buildDisjointRowUpdatePayloads,
} from '../sheetsFormulaGuard'
import type { LaptopRecord } from '../../../schemas/laptopRecordSchema'

const sampleRecord: LaptopRecord = {
  rowIndex: 14,
  id: 19,
  receivedAt: '2026-10-14T14:41:00.000Z',
  issuedAt: '2026-10-16T16:13:00.000Z',
  issuedToName: 'Коваленко О.О.',
  issuedToPhone: '0991112233',
  isCompleted: true,
  subdivision: 'Штаб',
  location: 'ППД',
  peomDescription: 'Робочий',
  network: 'Інтернет',
  updateType: 'Автоматично (Інтернет)',
  securityClassification: 'НТ',
  inventoryNumber: '35',
  asType: 'ІСД-І',
  responsibleName: 'Петренко П.П.',
  responsibleRank: 'солдат',
  responsiblePhone: '0992223344',
  hostname: 'DESKTOP-DEMO19',
  wifiMac: '14:13:33:03:4A:F3',
  esetInstanceId: '41a335e6-5297-4edb-a91d-93417e86d71e',
  militaryUnit: 'A0000',
  infosecRank: 'старший лейтенант',
  infosecName: 'Сидоренко С.С.',
  infosecPhone: '0993334455',
  policy: 'AC-3 Light (тільки парольна політика)',
  localNetwork: 'ІСД-Інтернет',
  checklistCompleted: true,
  createdBy: 'operator@example.org',
}

describe('Sheets Formula Guard — Disjoint Range Builder (AC-003, ADR-0003)', () => {
  it('splits a row write into two disjoint ranges A..E and G..AB, strictly omitting Column F', () => {
    const payloads = buildDisjointRowUpdatePayloads(sampleRecord)

    expect(payloads).toHaveLength(2)
    expect(payloads[0].range).toBe("'Список звітності'!A14:E14")
    expect(payloads[0].values[0]).toHaveLength(5) // A, B, C, D, E

    expect(payloads[1].range).toBe("'Список звітності'!G14:AB14")
    expect(payloads[1].values[0]).toHaveLength(22) // G..AB (22 columns)

    // Verify no range touches Column F
    for (const p of payloads) {
      expect(p.range).not.toMatch(/!F\d+/)
      expect(p.range).not.toMatch(/:F\d+/)
      expect(p.range).not.toMatch(/A\d+:AB\d+/)
    }
  })

  it('bundles multiple row updates into a single flat array of disjoint ranges for batchUpdate', () => {
    const secondRecord: LaptopRecord = { ...sampleRecord, rowIndex: 15, id: 20 }
    const batchPayloads = buildBatchDisjointUpdatePayloads([sampleRecord, secondRecord])

    expect(batchPayloads).toHaveLength(4)
    expect(batchPayloads.map((p) => p.range)).toEqual([
      "'Список звітності'!A14:E14",
      "'Список звітності'!G14:AB14",
      "'Список звітності'!A15:E15",
      "'Список звітності'!G15:AB15",
    ])
  })
})

