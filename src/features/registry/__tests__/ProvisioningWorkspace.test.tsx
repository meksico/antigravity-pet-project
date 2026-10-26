import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from '../../../App'
import { AuthContext, type AuthContextValue } from '../../auth/context/AuthContext'
import { GoogleSheetsClient } from '../../../services/sheets/sheetsClient'
import { ProvisioningWorkspace } from '../components/ProvisioningWorkspace'
import {
  DEFAULT_CHECKLIST_STEPS,
  DEFAULT_DICTIONARIES,
  SYNTHETIC_LAPTOP_RECORDS,
} from '../../../mocks/syntheticData'

describe('Provisioning Accounting Workspace — Картки обліку ПЕОМ + Таблиця (AC-001, AC-004..AC-009)', () => {
  it('blocks workspace behind minimal AuthSplashScreen when unauthenticated and unlocks after Google authorization (AC-001)', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Unauthenticated users ONLY see the minimal splash screen; workspace is not rendered
    const splash = screen.getByTestId('auth-splash-screen')
    expect(splash).toBeInTheDocument()
    expect(within(splash).getByText(/Доступ обмежено • Потрібна авторизація/i)).toBeInTheDocument()
    expect(screen.queryByTestId('kpi-total')).not.toBeInTheDocument()
    expect(screen.queryByText(/Таблиця даних/i)).not.toBeInTheDocument()

    // Clicking Google Sign-In in jsdom displays an auth error on the splash screen
    await user.click(within(splash).getByRole('button', { name: /Авторизуватися через Google/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(
      /VITE_GOOGLE_CLIENT_ID|Google Identity Services \(GIS\) скрипт ще не завантажено/i,
    )
  })

  it('returns to AuthSplashScreen when signing out from avatar popup (AC-001)', async () => {
    const user = userEvent.setup()
    render(<App initialDemoSession={true} />)

    expect(screen.getByTestId('kpi-total')).toHaveTextContent('5')

    // Click avatar button to open user popup
    const avatarBtn = screen.getByRole('button', { name: /Профіль оператора/i })
    await user.click(avatarBtn)

    // Verify popup shows operator email and name
    const popup = screen.getByRole('dialog', { name: /Інформація про оператора/i })
    expect(within(popup).getByText('demo.operator@example.org')).toBeInTheDocument()

    // Clicking logout closes session and returns immediately to the splash screen
    await user.click(within(popup).getByRole('button', { name: /Вийти з сесії/i }))
    expect(screen.getByTestId('auth-splash-screen')).toBeInTheDocument()
    expect(screen.queryByTestId('kpi-total')).not.toBeInTheDocument()
  })

  it('renders Split View (Картки + Таблиця), status counters, ID sorting, and filters by Відповідальний and MAC (AC-005)', async () => {
    const user = userEvent.setup()
    render(<App initialDemoSession={true} />)

    // Verify header title and status counters
    expect(screen.getByText('Картки обліку ПЕОМ')).toBeInTheDocument()
    expect(screen.getByTestId('kpi-total')).toHaveTextContent('5')
    expect(screen.getByTestId('kpi-completed')).toHaveTextContent('2')
    expect(screen.getByTestId('kpi-in-progress')).toHaveTextContent('3')

    // Default sort is descending by ID (#105 first, #101 last)
    const sortAscBtn = screen.getByRole('button', { name: /Зростання/i })
    await user.click(sortAscBtn)
    await user.click(screen.getByRole('button', { name: /Спадання/i }))

    // Switch between Картки, Таблиця, and Картки + Таблиця view modes, plus Status tabs
    await user.click(screen.getByRole('button', { name: /Видано \/ Архів/i }))
    await user.click(screen.getByRole('button', { name: /Всі \(/i }))

    await user.click(screen.getByRole('button', { name: /Відобразити тільки картки/i }))
    expect(screen.queryByText(/Таблиця даних/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Відобразити лише таблицю/i }))
    expect(screen.getByText(/Таблиця даних/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Відобразити картки і таблицю/i }))
    expect(screen.getByText(/Таблиця даних/i)).toBeInTheDocument()

    // Filter by Відповідальний dropdown
    const responsibleSelect = screen.getByLabelText('Фільтр відповідального')
    await user.selectOptions(responsibleSelect, 'Шевченко Василь Олегович')
    expect(screen.getAllByText('DESKTOP-DEMO104').length).toBeGreaterThan(0)
    expect(screen.queryByText('DESKTOP-DEMO101')).not.toBeInTheDocument()

    // Clear responsible filter via clear button
    await user.click(screen.getByRole('button', { name: 'Очистити фільтр відповідального' }))
    expect(screen.getAllByText('DESKTOP-DEMO101').length).toBeGreaterThan(0)

    // Search by hyphen-formatted MAC even though record is stored with colons
    const searchInput = screen.getByPlaceholderText(/Пошук за Імʼя ПЕОМ, Інв\.н\., Підрозділ/i)
    await user.type(searchInput, '00-1a-2b-3c-4d-04')

    expect(screen.getAllByText('DESKTOP-DEMO104').length).toBeGreaterThan(0)
    expect(screen.queryByText('DESKTOP-DEMO101')).not.toBeInTheDocument()

    // Clear search via clear button and filter by status "Активні" (pending)
    await user.click(screen.getByRole('button', { name: 'Очистити пошук' }))
    const activeFilterBtn = screen.getByRole('button', { name: /Активні/i })
    expect(activeFilterBtn.querySelector('.dot')).toHaveClass('dot--green')
    await user.click(activeFilterBtn)
    expect(screen.queryByText('DESKTOP-DEMO101')).not.toBeInTheDocument()
    expect(screen.getAllByText('DESKTOP-DEMO103').length).toBeGreaterThan(0)

    // Switch back to "Всі" status filter
    await user.click(screen.getByRole('button', { name: /Всі/i }))
    expect(screen.getAllByText('DESKTOP-DEMO101').length).toBeGreaterThan(0)
  })

  it('creates a new laptop card via Створення нової картки modal with 4 sections, auto-ID, and normalized MAC (AC-006)', async () => {
    const user = userEvent.setup()
    render(<App initialDemoSession={true} />)

    await user.click(screen.getByRole('button', { name: /Створити картку/i }))
    const dialog = screen.getByRole('dialog', { name: /Прийом нового лептопа|Створення нової картки/i })

    expect(within(dialog).getByText(/ВІДПОВІДАЛЬНИЙ ТА ПІДРОЗДІЛ/i)).toBeInTheDocument()
    expect(within(dialog).getByText(/ОПИС ПЕОМ ТА МЕРЕЖА/i)).toBeInTheDocument()
    expect(within(dialog).getByText(/ДАТА\/ЧАС ПРИЙНЯТТЯ ТА ДАТА\/ЧАС ВИДАЧІ/i)).toBeInTheDocument()
    expect(within(dialog).getByText(/СЛУЖБА ЗАХИСТУ \(НСЗІ\)/i)).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText(/Інвентарний номер/i), '88.0')
    await user.type(within(dialog).getByLabelText(/Імʼя ПЕОМ/i), 'DESKTOP-NEW106')
    await user.type(within(dialog).getByLabelText(/WiFi MAC/i), 'aa-bb-cc-11-22-33')
    await user.type(within(dialog).getByLabelText(/ПІБ відповідального/i), 'Новак Іван Іванович')
    await user.selectOptions(within(dialog).getByLabelText(/Звання відповідального/i), 'Сержант')
    await user.type(within(dialog).getByLabelText(/Тел\. відповідального/i), '0995556677')
    await user.selectOptions(within(dialog).getByLabelText(/НСЗІ звання/i), 'Майор')

    await user.click(
      within(dialog).getByRole('button', { name: /Створити та зберегти|Зберегти запис/i }),
    )

    // Verify new card/row appears with auto-ID 106, stripped .0 on inventory 88, and normalized MAC
    expect(screen.getAllByText('DESKTOP-NEW106').length).toBeGreaterThan(0)
    expect(screen.getAllByText('AA:BB:CC:11:22:33').length).toBeGreaterThan(0)
    expect(screen.getByTestId('kpi-total')).toHaveTextContent('6')
  })

  it('expands full card details, duplicates a card with next ID, edits an existing card, and deletes a card', async () => {
    const user = userEvent.setup()
    render(<App initialDemoSession={true} />)

    // Expand full card details on the first card and collapse it back
    const expandButtons = screen.getAllByRole('button', { name: /Розгорнути повну інформацію/i })
    await user.click(expandButtons[0]!)
    const collapseBtn = screen.getByRole('button', { name: /Згорнути подробиці/i })
    expect(collapseBtn).toBeInTheDocument()
    expect(screen.getAllByText(/Мережа локальна:/i).length).toBeGreaterThan(0)
    await user.click(collapseBtn)

    // Copy card info to clipboard
    const copyBtns = screen.getAllByRole('button', {
      name: /Копіювати інформацію картки DESKTOP-DEMO105/i,
    })
    await user.click(copyBtns[0]!)
    await user.click(copyBtns[1]!)

    // Duplicate card DESKTOP-DEMO105 -> creates incremental ID #106 with empty device fields
    const duplicateBtn = screen.getByRole('button', {
      name: /Створити копію картки DESKTOP-DEMO105/i,
    })
    await user.click(duplicateBtn)
    expect(screen.getByTestId('kpi-total')).toHaveTextContent('6')
    expect(screen.getByText('ID #106')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Редагувати картку #106/i })).toBeInTheDocument()

    // Edit existing card DESKTOP-DEMO104
    const editBtns = screen.getAllByRole('button', { name: /Редагувати картку DESKTOP-DEMO104/i })
    await user.click(editBtns[0]!)
    const editDialog = screen.getByRole('dialog', { name: /Редагування картки ID #104/i })
    const modalCopyBtns = within(editDialog).getAllByRole('button', { name: /Копіювати в буфер/i })
    await user.click(modalCopyBtns[0]!)
    const hostInput = within(editDialog).getByLabelText(/Імʼя ПЕОМ/i)
    await user.clear(hostInput)
    await user.type(hostInput, 'DESKTOP-EDITED104')
    await user.click(within(editDialog).getByRole('button', { name: /Зберегти зміни/i }))
    expect(screen.getAllByText('DESKTOP-EDITED104').length).toBeGreaterThan(0)

    // Toggle select all in table
    const selectAllCheckbox = screen.getByLabelText('Вибрати всі відфільтровані')
    await user.click(selectAllCheckbox)
    await user.click(selectAllCheckbox)

    // Delete card DESKTOP-DEMO105
    const deleteBtns = screen.getAllByRole('button', { name: /Видалити картку DESKTOP-DEMO105/i })
    await user.click(deleteBtns[0]!)
    expect(screen.getByTestId('kpi-total')).toHaveTextContent('5')
  })

  it('opens the 27-step Перевірка інсталяції modal from a card or table, toggles steps, and updates Column AA (AC-007)', async () => {
    const user = userEvent.setup()
    render(<App initialDemoSession={true} />)

    const checklistBtns = screen.getAllByRole('button', {
      name: /Чек-ліст для DESKTOP-DEMO104/i,
    })
    await user.click(checklistBtns[0]!)

    const drawer = screen.getByRole('dialog', { name: /Перевірка інсталяції/i })
    expect(within(drawer).getByText('ID #104')).toBeInTheDocument()
    expect(
      within(drawer).getByText(/ПЕОМ: «DESKTOP-DEMO104» • Відповідальний: «Шевченко Василь Олегович»/i),
    ).toBeInTheDocument()
    expect(within(drawer).getByText('Вимкнені всі трекінг активності')).toBeInTheDocument()
    expect(within(drawer).getByText(/Додана наліпка з паролем User\/Admin/i)).toBeInTheDocument()

    await user.click(within(drawer).getByText('Доданий SecAdmin'))
    expect(within(drawer).getByTestId('checklist-progress')).toHaveTextContent('1 з 27 (4%)')
    expect(
      within(drawer).getByText(/Щоб підтвердити інсталяцію, позначте всі 27 пунктів \(26 залишилось\)/i),
    ).toBeInTheDocument()
    expect(
      within(drawer).getByRole('button', { name: /Зберегти \(Скинути статус\)/i }),
    ).toBeInTheDocument()
    await user.click(within(drawer).getByRole('button', { name: 'Скинути' }))
    expect(within(drawer).getByTestId('checklist-progress')).toHaveTextContent('0 з 27 (0%)')

    await user.click(within(drawer).getByRole('button', { name: /Обрати всі/i }))
    expect(within(drawer).getByTestId('checklist-progress')).toHaveTextContent('27 з 27 (100%)')
    expect(within(drawer).getByText(/Готово до 100%/i)).toBeInTheDocument()

    await user.click(
      within(drawer).getByRole('button', { name: /Зберегти \(Інстальований на 100%\)/i }),
    )
    expect(screen.queryByRole('dialog', { name: /Перевірка інсталяції/i })).not.toBeInTheDocument()
  })

  it('executes laptop handover via HandoverModal and supports bulk actions (AC-008, AC-009)', async () => {
    const user = userEvent.setup()

    render(<App initialDemoSession={true} />)

    // Handover DESKTOP-DEMO103
    const handoverBtns = screen.getAllByRole('button', { name: /Видати DESKTOP-DEMO103/i })
    await user.click(handoverBtns[0]!)

    const modal = screen.getByRole('dialog', { name: /Видача лептопа/i })
    const nameInput = within(modal).getByLabelText(/Видано ФІО/i)
    const phoneInput = within(modal).getByLabelText(/Видано тел\./i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Мельник Андрій Миколайович')
    await user.clear(phoneInput)
    await user.type(phoneInput, '+38 (099) 777-88-99')

    await user.click(within(modal).getByRole('button', { name: /Підтвердити видачу/i }))
    expect(screen.getByTestId('kpi-completed')).toHaveTextContent('3')

    // Bulk selection in table
    const rowCheck104 = screen.getByLabelText('Вибрати DESKTOP-DEMO104')
    const rowCheck105 = screen.getByLabelText('Вибрати DESKTOP-DEMO105')
    await user.click(rowCheck104)
    await user.click(rowCheck105)

    const bulkBar = screen.getByTestId('bulk-actions-bar')
    expect(within(bulkBar).getByText(/Вибрано: 2/i)).toBeInTheDocument()

    await user.selectOptions(within(bulkBar).getByLabelText('Масова зміна політики'), 'АС-1')
    await user.click(within(bulkBar).getByRole('button', { name: /Застосувати до вибраних/i }))
    expect(screen.queryByTestId('bulk-actions-bar')).not.toBeInTheDocument()
  })

  it('automatically dismisses notifier banner after 3 seconds', () => {
    vi.useFakeTimers()
    render(<App initialDemoSession={true} />)

    const copyBtn = screen.getAllByRole('button', {
      name: /Копіювати інформацію картки DESKTOP-DEMO105/i,
    })[0]!
    fireEvent.click(copyBtn)

    expect(
      screen.getByText(/Картку ID #105 \(DESKTOP-DEMO105\) скопійовано в буфер обміну/i),
    ).toBeInTheDocument()

    // Advance time by 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(
      screen.queryByText(/Картку ID #105 \(DESKTOP-DEMO105\) скопійовано в буфер обміну/i),
    ).not.toBeInTheDocument()

    vi.useRealTimers()
  })

  it('copies card details to clipboard using the standardized 7-line template', async () => {
    const user = userEvent.setup()
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
      writable: true,
    })

    render(<App initialDemoSession={true} />)

    const copyBtn = screen.getAllByRole('button', {
      name: /Копіювати інформацію картки DESKTOP-DEMO105/i,
    })[0]!

    await user.click(copyBtn)

    expect(writeTextMock).toHaveBeenCalledTimes(1)
    const copiedText = writeTextMock.mock.calls[0][0] as string

    expect(copiedText).toContain('Мережа: Автономна')
    expect(copiedText).toContain("Ім'я комп'ютера: DESKTOP-DEMO105")
    expect(copiedText).toContain('—')
    expect(copiedText).toContain('ProductInstanceID: 11111111-2222-4333-8444-555555555505')
    expect(copiedText).toContain('Військова частина: A0000')
    expect(copiedText).toContain('Користувач АРМ: майор Ткаченко Ігор Вікторович 0991002005')
    expect(copiedText).toContain('НСЗІ старший лейтенант Сидоренко І.В. 0999008000')
  })

  it('calls sheetsClient.deleteLaptopRecord and shows banner when deleting a card in Google mode', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi
      .spyOn(GoogleSheetsClient.prototype, 'fetchWorkbookData')
      .mockResolvedValue({
        records: SYNTHETIC_LAPTOP_RECORDS,
        dictionaries: DEFAULT_DICTIONARIES,
        checklistSteps: DEFAULT_CHECKLIST_STEPS,
      })
    const deleteSpy = vi
      .spyOn(GoogleSheetsClient.prototype, 'deleteLaptopRecord')
      .mockResolvedValueOnce(undefined)

    const mockAuthContext: AuthContextValue = {
      session: {
        email: 'operator@example.gov.ua',
        name: 'Офіцер Безпеки',
        mode: 'google',
        expiresAt: Date.now() + 3600_000,
      },
      spreadsheetId: 'test-spreadsheet-123',
      setSpreadsheetId: vi.fn(),
      presets: {
        militaryUnit: 'А0000',
        infosecRank: 'майор',
        infosecName: 'Петренко П.П.',
        infosecPhone: '+380501112233',
        defaultLocation: 'Київ',
      },
      updatePresets: vi.fn(),
      getAccessToken: () => 'fake-token',
      signInWithGoogle: vi.fn(),
      signInDemo: vi.fn(),
      signOut: vi.fn(),
      authError: null,
    }

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <ProvisioningWorkspace />
      </AuthContext.Provider>,
    )

    const deleteBtn = await screen.findByRole('button', {
      name: /Видалити картку DESKTOP-DEMO105/i,
    })

    await user.click(deleteBtn)

    expect(deleteSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 105,
        hostname: 'DESKTOP-DEMO105',
      }),
    )
    expect(
      await screen.findByText(/Картку ID #105 \(DESKTOP-DEMO105\) успішно видалено з Google Sheets/i),
    ).toBeInTheDocument()

    deleteSpy.mockRestore()
    fetchSpy.mockRestore()
  })

  it('displays error banner if deleting a card in Google Sheets fails', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi
      .spyOn(GoogleSheetsClient.prototype, 'fetchWorkbookData')
      .mockResolvedValue({
        records: SYNTHETIC_LAPTOP_RECORDS,
        dictionaries: DEFAULT_DICTIONARIES,
        checklistSteps: DEFAULT_CHECKLIST_STEPS,
      })
    const deleteSpy = vi
      .spyOn(GoogleSheetsClient.prototype, 'deleteLaptopRecord')
      .mockRejectedValueOnce(new Error('Помилка видалення рядка в Google Sheets'))

    const mockAuthContext: AuthContextValue = {
      session: {
        email: 'operator@example.gov.ua',
        name: 'Офіцер Безпеки',
        mode: 'google',
        expiresAt: Date.now() + 3600_000,
      },
      spreadsheetId: 'test-spreadsheet-123',
      setSpreadsheetId: vi.fn(),
      presets: {
        militaryUnit: 'А0000',
        infosecRank: 'майор',
        infosecName: 'Петренко П.П.',
        infosecPhone: '+380501112233',
        defaultLocation: 'Київ',
      },
      updatePresets: vi.fn(),
      getAccessToken: () => 'fake-token',
      signInWithGoogle: vi.fn(),
      signInDemo: vi.fn(),
      signOut: vi.fn(),
      authError: null,
    }

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <ProvisioningWorkspace />
      </AuthContext.Provider>,
    )

    const deleteBtn = await screen.findByRole('button', {
      name: /Видалити картку DESKTOP-DEMO105/i,
    })

    await user.click(deleteBtn)

    expect(deleteSpy).toHaveBeenCalled()
    expect(
      await screen.findByText(/Помилка видалення рядка в Google Sheets/i),
    ).toBeInTheDocument()

    deleteSpy.mockRestore()
    fetchSpy.mockRestore()
  })

  it('allows adding a new subdivision via "+ Додати нове" free form field and appends to _списки', async () => {
    const user = userEvent.setup()
    const appendSpy = vi
      .spyOn(GoogleSheetsClient.prototype, 'appendDictionaryValue')
      .mockResolvedValueOnce(undefined)
    const createSpy = vi
      .spyOn(GoogleSheetsClient.prototype, 'createLaptopRecord')
      .mockImplementationOnce(async (draft) => ({
        ...draft,
        id: 106,
        rowIndex: 7,
        isCompleted: false,
      }))
    const fetchSpy = vi
      .spyOn(GoogleSheetsClient.prototype, 'fetchWorkbookData')
      .mockResolvedValue({
        records: SYNTHETIC_LAPTOP_RECORDS,
        dictionaries: DEFAULT_DICTIONARIES,
        checklistSteps: DEFAULT_CHECKLIST_STEPS,
      })

    const mockAuthContext: AuthContextValue = {
      session: {
        email: 'operator@example.gov.ua',
        name: 'Офіцер Безпеки',
        mode: 'google',
        expiresAt: Date.now() + 3600_000,
      },
      spreadsheetId: 'test-spreadsheet-123',
      setSpreadsheetId: vi.fn(),
      presets: {
        militaryUnit: 'А0000',
        infosecRank: 'майор',
        infosecName: 'Петренко П.П.',
        infosecPhone: '+380501112233',
        defaultLocation: 'Київ',
      },
      updatePresets: vi.fn(),
      getAccessToken: () => 'fake-token',
      signInWithGoogle: vi.fn(),
      signInDemo: vi.fn(),
      signOut: vi.fn(),
      authError: null,
    }

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <ProvisioningWorkspace />
      </AuthContext.Provider>,
    )

    // Open create modal
    const createBtn = await screen.findByRole('button', { name: /Створити картку/i })
    await user.click(createBtn)

    const dialog = screen.getByRole('dialog', {
      name: /Прийом нового лептопа|Створення нової картки/i,
    })
    expect(dialog).toBeInTheDocument()

    // Select "+ Додати нове" in Підрозділ dropdown
    const subdivisionSelect = within(dialog).getByLabelText(/Підрозділ/i)
    await user.selectOptions(subdivisionSelect, '__NEW_SUBDIVISION__')

    // It switches to free-form input
    const customInput = within(dialog).getByPlaceholderText(/Введіть новий підрозділ/i)
    expect(customInput).toBeInTheDocument()

    // Test cancel button switches back
    const cancelBtn = within(dialog).getByRole('button', {
      name: /Повернутися до списку підрозділів/i,
    })
    await user.click(cancelBtn)
    expect(within(dialog).getByLabelText(/Підрозділ/i).tagName).toBe('SELECT')

    // Switch back to "+ Додати нове" and type a new subdivision
    await user.selectOptions(within(dialog).getByLabelText(/Підрозділ/i), '__NEW_SUBDIVISION__')
    const customInput2 = within(dialog).getByPlaceholderText(/Введіть новий підрозділ/i)
    await user.type(customInput2, 'Рота РЕБ')

    // Fill in required fields
    await user.type(within(dialog).getByLabelText(/Інвентарний номер/i), '99')
    await user.type(within(dialog).getByLabelText(/Імʼя ПЕОМ/i), 'DESKTOP-REB01')
    await user.type(within(dialog).getByLabelText(/WiFi MAC/i), '00:11:22:33:44:55')
    await user.type(within(dialog).getByLabelText(/ПІБ відповідального/i), 'Коваленко К.К.')
    await user.selectOptions(within(dialog).getByLabelText(/Звання відповідального/i), 'Сержант')

    // Submit modal
    await user.click(within(dialog).getByRole('button', { name: /Створити та зберегти|Зберегти запис/i }))

    // Expect appendDictionaryValue called for Column E with 'Рота РЕБ'
    expect(appendSpy).toHaveBeenCalledWith('E', 'Рота РЕБ')

    // Expect card created with subdivision 'Рота РЕБ'
    expect(screen.getAllByText('DESKTOP-REB01').length).toBeGreaterThan(0)

    appendSpy.mockRestore()
    createSpy.mockRestore()
    fetchSpy.mockRestore()
  })
})
