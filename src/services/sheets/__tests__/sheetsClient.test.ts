import { describe, expect, it, vi } from 'vitest'
import { GoogleSheetsClient, RowIdMismatchError } from '../sheetsClient'
import { SYNTHETIC_LAPTOP_RECORDS } from '../../../mocks/syntheticData'

describe('GoogleSheetsClient — REST API v4 Integration & Formula Safety (AC-003, AC-006, AC-009, AC-010)', () => {
  it('fetches workbook data in a single batchGet call and only requests Column A of Чек-ліст', async () => {
    const mockFetch = vi.fn(async (url: string) => {
      expect(url).toContain('values:batchGet')
      expect(url).toContain(encodeURIComponent("'Чек-ліст'!A1:A30"))
      expect(url).not.toContain(encodeURIComponent("'Чек-ліст'!A1:B"))

      return new Response(
        JSON.stringify({
          valueRanges: [
            {
              range: "'Список звітності'!A1:AB10",
              values: [
                ['ID', 'Дата/час прийняття', 'Дата/час видачі'],
                [
                  '5',
                  46309.5,
                  46311.5,
                  'Коваленко О.О.',
                  '0991112233',
                  1,
                  'САДн',
                  'ППД',
                  'Робочий',
                  'Інтернет',
                  'Автоматично (Інтернет)',
                  'НТ',
                  '18.0',
                  'ІСД-І',
                  'Петренко П.П.',
                  'солдат',
                  '0992223344',
                  'DESKTOP-DEMO05',
                  '80-13-16-7d-48-3a',
                  '91481368-cc47-43ad-ab55-9151ca09eef2',
                  'A0000',
                  'старший лейтенант',
                  'Сидоренко С.С.',
                  '0993334455',
                  'AC-3 Light (тільки парольна політика)',
                  'ІСД-Интернет',
                  'true',
                  'operator@example.org',
                ],
              ],
            },
            {
              range: "'_списки'!A1:J100",
              values: [
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
                ],
                [
                  'Інтернет',
                  'Автоматично (Інтернет)',
                  'НТ',
                  'ІСД-І',
                  'САДн',
                  'ППД',
                  'Робочий',
                  'A0000',
                  'АС-1',
                  'Солдат',
                ],
              ],
            },
            {
              range: "'Чек-ліст'!A1:A30",
              values: [['Вимкнені всі трекінг активності'], ['Доданий SecAdmin']],
            },
          ],
        }),
        { status: 200 },
      )
    })

    const client = new GoogleSheetsClient({
      spreadsheetId: 'test-sheet-id',
      getAccessToken: () => 'test-access-token',
      fetchImpl: mockFetch as unknown as typeof fetch,
    })

    const data = await client.fetchWorkbookData()
    expect(data.records).toHaveLength(1)
    expect(data.records[0].id).toBe(5)
    expect(data.records[0].inventoryNumber).toBe('18')
    expect(data.records[0].wifiMac).toBe('80:13:16:7D:48:3A')
    expect(data.records[0].localNetwork).toBe('ІСД-Інтернет')
    expect(data.dictionaries.networks).toEqual(['Інтернет'])
    expect(data.checklistSteps).toHaveLength(2)
  })

  it('verifies row ID before updating and writes disjoint ranges A..E and G..AB (never F)', async () => {
    const calls: { url: string; body?: unknown }[] = []
    const mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined })
      if (url.includes('values:batchUpdate')) {
        return new Response(JSON.stringify({ totalUpdatedCells: 27 }), { status: 200 })
      }
      return new Response(JSON.stringify({ values: [['101']] }), { status: 200 })
    })

    const client = new GoogleSheetsClient({
      spreadsheetId: 'test-sheet-id',
      getAccessToken: () => 'test-access-token',
      fetchImpl: mockFetch as unknown as typeof fetch,
    })

    await client.updateLaptopRecord(SYNTHETIC_LAPTOP_RECORDS[0])

    expect(calls).toHaveLength(2)
    const batchCall = calls[1].body as {
      valueInputOption: string
      data: { range: string; values: unknown[][] }[]
    }
    expect(batchCall.valueInputOption).toBe('USER_ENTERED')
    expect(batchCall.data).toHaveLength(2)
    expect(batchCall.data[0].range).toBe("'Список звітності'!A2:E2")
    expect(batchCall.data[1].range).toBe("'Список звітності'!G2:AB2")
  })

  it('throws RowIdMismatchError when pre-write row ID guard detects a concurrent row shift (AC-010)', async () => {
    const mockFetch = vi.fn(async () => {
      return new Response(JSON.stringify({ values: [['999']] }), { status: 200 })
    })

    const client = new GoogleSheetsClient({
      spreadsheetId: 'test-sheet-id',
      getAccessToken: () => 'test-access-token',
      fetchImpl: mockFetch as unknown as typeof fetch,
    })

    await expect(client.updateLaptopRecord(SYNTHETIC_LAPTOP_RECORDS[0])).rejects.toBeInstanceOf(
      RowIdMismatchError,
    )
  })

  it('bundles multi-row updates into a single batchUpdate HTTP call and skips empty arrays (AC-009)', async () => {
    const mockFetch = vi.fn(async () => {
      return new Response(JSON.stringify({ totalUpdatedCells: 54 }), { status: 200 })
    })

    const client = new GoogleSheetsClient({
      spreadsheetId: 'test-sheet-id',
      getAccessToken: () => 'test-access-token',
      fetchImpl: mockFetch as unknown as typeof fetch,
    })

    await client.batchUpdateLaptopRecords([])
    expect(mockFetch).not.toHaveBeenCalled()

    await client.batchUpdateLaptopRecords([
      SYNTHETIC_LAPTOP_RECORDS[0],
      SYNTHETIC_LAPTOP_RECORDS[1],
    ])

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('computes MAX(ID) + 1 and nextRowIndex when creating a new laptop record (AC-006)', async () => {
    const mockFetch = vi.fn(async (url: string) => {
      if (url.includes('values:batchUpdate')) {
        return new Response(JSON.stringify({ totalUpdatedCells: 27 }), { status: 200 })
      }
      return new Response(
        JSON.stringify({
          values: [['ID'], ['101.0'], ['105']],
        }),
        { status: 200 },
      )
    })

    const client = new GoogleSheetsClient({
      spreadsheetId: 'test-sheet-id',
      getAccessToken: () => 'test-access-token',
      fetchImpl: mockFetch as unknown as typeof fetch,
    })

    const { rowIndex: _r, id: _id, isCompleted: _c, ...draft } = SYNTHETIC_LAPTOP_RECORDS[2]
    const created = await client.createLaptopRecord(draft)

    expect(created.id).toBe(106)
    expect(created.rowIndex).toBe(4)
    expect(created.isCompleted).toBe(false)
  })

  it('deletes a row in Google Sheets via deleteDimension (ROWS) and restores F2 array formula when row 2 is deleted', async () => {
    const calls: { url: string; body?: unknown; method?: string }[] = []
    const mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({
        url,
        method: init?.method,
        body: init?.body ? JSON.parse(init.body as string) : undefined,
      })

      if (url.includes('fields=sheets.properties')) {
        return new Response(
          JSON.stringify({
            sheets: [
              { properties: { sheetId: 12345, title: 'Список звітності' } },
              { properties: { sheetId: 67890, title: '_списки' } },
            ],
          }),
          { status: 200 },
        )
      }

      if (url.includes('A2?valueRenderOption=UNFORMATTED_VALUE')) {
        return new Response(JSON.stringify({ values: [['101']] }), { status: 200 })
      }

      return new Response(JSON.stringify({ replies: [{}] }), { status: 200 })
    })

    const client = new GoogleSheetsClient({
      spreadsheetId: 'test-sheet-id',
      getAccessToken: () => 'test-access-token',
      fetchImpl: mockFetch as unknown as typeof fetch,
    })

    await client.deleteLaptopRecord(SYNTHETIC_LAPTOP_RECORDS[0]) // rowIndex: 2, id: 101

    // Should have checked row A2, requested sheet metadata, called :batchUpdate deleteDimension, and restored F2
    const batchUpdateCall = calls.find((c) => c.url.endsWith(':batchUpdate'))
    expect(batchUpdateCall).toBeDefined()
    expect(batchUpdateCall?.body).toEqual({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: 12345,
              dimension: 'ROWS',
              startIndex: 1, // 0-based for row 2
              endIndex: 2,
            },
          },
        },
      ],
    })

    // Because row 2 was deleted, F2 array formula restoration call was made
    const f2RestoreCall = calls.find((c) => c.url.includes('F2?valueInputOption=USER_ENTERED'))
    expect(f2RestoreCall).toBeDefined()
  })

  it('scans Column A to find real row index when pre-delete check detects shifted row, and throws if missing', async () => {
    const calls: string[] = []
    const mockFetch = vi.fn(async (url: string) => {
      calls.push(url)
      const decodedUrl = decodeURIComponent(url)
      if (decodedUrl.includes('A5?valueRenderOption=UNFORMATTED_VALUE')) {
        // ID check on expected row returns shifted ID
        return new Response(JSON.stringify({ values: [['999']] }), { status: 200 })
      }
      if (decodedUrl.includes('A1:A2000?valueRenderOption=UNFORMATTED_VALUE')) {
        // Return column A where 104 is actually at row 3 (index 2)
        return new Response(
          JSON.stringify({
            values: [['ID'], ['101'], ['104']],
          }),
          { status: 200 },
        )
      }
      return new Response(JSON.stringify({}), { status: 200 })
    })

    const client = new GoogleSheetsClient({
      spreadsheetId: 'test-sheet-id',
      getAccessToken: () => 'test-access-token',
      fetchImpl: mockFetch as unknown as typeof fetch,
    })

    const recordWithOldRowIndex = { ...SYNTHETIC_LAPTOP_RECORDS[1], id: 104, rowIndex: 5 }
    await client.deleteLaptopRecord(recordWithOldRowIndex)

    // Should have checked A5, then scanned A1:A2000, then batchUpdated row 3 (startIndex 2, endIndex 3)
    expect(calls.some((url) => decodeURIComponent(url).includes('A1:A2000'))).toBe(true)

    // And if not found in Column A, throws error
    const recordNotFound = { ...SYNTHETIC_LAPTOP_RECORDS[1], id: 9999, rowIndex: 10 }
    await expect(client.deleteLaptopRecord(recordNotFound)).rejects.toThrow(
      /не знайдено в таблиці Google Sheets/i,
    )
  })

  it('appends a new dictionary value to the next empty row in _списки (Column E for Підрозділ)', async () => {
    const calls: { url: string; method?: string; body?: unknown }[] = []
    const mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({
        url,
        method: init?.method,
        body: init?.body ? JSON.parse(init.body as string) : undefined,
      })

      if (decodeURIComponent(url).includes("'_списки'!E1:E100")) {
        return new Response(
          JSON.stringify({
            values: [['Підрозділ'], ['САДн'], ['2МБ'], ['Штаб']],
          }),
          { status: 200 },
        )
      }

      return new Response(JSON.stringify({ updatedCells: 1 }), { status: 200 })
    })

    const client = new GoogleSheetsClient({
      spreadsheetId: 'test-sheet-id',
      getAccessToken: () => 'test-access-token',
      fetchImpl: mockFetch as unknown as typeof fetch,
    })

    // 1. Append new subdivision "Рота РЕБ"
    await client.appendDictionaryValue('E', 'Рота РЕБ')

    const putCall = calls.find((c) => c.method === 'PUT')
    expect(putCall).toBeDefined()
    expect(decodeURIComponent(putCall?.url ?? '')).toContain("'_списки'!E5")
    expect(putCall?.body).toEqual({
      range: "'_списки'!E5",
      values: [['Рота РЕБ']],
    })

    // 2. If subdivision already exists, skips write
    calls.length = 0
    await client.appendDictionaryValue('E', 'САДн')
    expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(0)

    // 3. If value is whitespace or empty, skips
    calls.length = 0
    await client.appendDictionaryValue('E', '   ')
    expect(calls).toHaveLength(0)
  })

  it('throws 401 when access token is missing or API returns error status', async () => {
    const unauthClient = new GoogleSheetsClient({
      spreadsheetId: 'test-sheet-id',
      getAccessToken: () => null,
    })
    await expect(unauthClient.fetchWorkbookData()).rejects.toThrow(/Відсутній OAuth 2.0 токен/i)

    const errorClient = new GoogleSheetsClient({
      spreadsheetId: 'test-sheet-id',
      getAccessToken: () => 'valid-token',
      fetchImpl: vi.fn(async () => new Response('Forbidden', { status: 403 })) as unknown as typeof fetch,
    })
    await expect(errorClient.fetchWorkbookData()).rejects.toThrow(/HTTP 403/i)
  })
})

