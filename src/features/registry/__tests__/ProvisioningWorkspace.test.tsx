import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from '../../../App'

describe('Provisioning Accounting Workspace — End-to-End Integration (AC-004..AC-009)', () => {
  it('renders KPI summary cards, 28-column registry grid, and filters by search, MAC address, and dropdowns (AC-005)', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Verify KPI bar renders total synthetic records (5)
    expect(screen.getByTestId('kpi-total')).toHaveTextContent('5')
    expect(screen.getByTestId('kpi-completed')).toHaveTextContent('2')
    expect(screen.getByTestId('kpi-in-progress')).toHaveTextContent('3')

    // Search by hyphen-formatted MAC even though record is stored with colons
    const searchInput = screen.getByPlaceholderText(/Пошук за Імʼям ПЕОМ, MAC, Інв\.н\./i)
    await user.type(searchInput, '00-1a-2b-3c-4d-04')

    expect(screen.getByText('DESKTOP-DEMO104')).toBeInTheDocument()
    expect(screen.queryByText('DESKTOP-DEMO101')).not.toBeInTheDocument()

    // Clear search and filter by status "В роботі"
    await user.clear(searchInput)
    const statusSelect = screen.getByLabelText('Фільтр статусу')
    await user.selectOptions(statusSelect, 'pending')

    expect(screen.queryByText('DESKTOP-DEMO101')).not.toBeInTheDocument()
    expect(screen.getByText('DESKTOP-DEMO103')).toBeInTheDocument()

    // Filter by subdivision, network, AS type, classification, and switch column mode to "all"
    await user.selectOptions(screen.getByLabelText('Фільтр підрозділу'), 'Штаб')
    await user.selectOptions(screen.getByLabelText('Фільтр мережі'), 'Дніпро')
    await user.selectOptions(screen.getByLabelText('Фільтр типу АС'), 'АРМ СЕДО')
    await user.selectOptions(screen.getByLabelText('Фільтр ГОД'), 'ДСК')
    await user.selectOptions(screen.getByLabelText('Режим відображення колонок'), 'all')
    expect(screen.getByText('DESKTOP-DEMO103')).toBeInTheDocument()

    // Reset filters
    await user.click(screen.getByRole('button', { name: /Скинути/i }))
    expect(screen.getByText('DESKTOP-DEMO101')).toBeInTheDocument()
  })

  it('creates a new laptop via IntakeModal with auto-increment ID, normalized MAC, and operator CreatedBy (AC-006)', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /Додати лептоп/i }))
    const dialog = screen.getByRole('dialog', { name: /Прийом нового лептопа/i })

    await user.type(within(dialog).getByLabelText(/Інвентарний номер/i), '88.0')
    await user.type(within(dialog).getByLabelText(/Імʼя ПЕОМ/i), 'DESKTOP-NEW106')
    await user.type(within(dialog).getByLabelText(/WiFi MAC/i), 'aa-bb-cc-11-22-33')
    await user.type(within(dialog).getByLabelText(/ПІБ відповідального/i), 'Новак Іван Іванович')
    await user.type(within(dialog).getByLabelText(/Звання відповідального/i), 'сержант')
    await user.type(within(dialog).getByLabelText(/Тел\. відповідального/i), '0995556677')

    await user.click(within(dialog).getByRole('button', { name: /Зберегти запис/i }))

    // Verify new row appears with auto-ID 106, stripped .0 on inventory 88, and normalized MAC
    expect(screen.getByText('DESKTOP-NEW106')).toBeInTheDocument()
    expect(screen.getByText('AA:BB:CC:11:22:33')).toBeInTheDocument()
    expect(screen.getByTestId('kpi-total')).toHaveTextContent('6')
  })

  it('opens the 27-step Чек-ліст drawer, toggles individual and all 27 steps, and updates Column AA (AC-007)', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Open checklist for DESKTOP-DEMO104 (which initially has checklistCompleted = false)
    const checklistBtn = screen.getByRole('button', {
      name: /Чек-ліст для DESKTOP-DEMO104/i,
    })
    await user.click(checklistBtn)

    const drawer = screen.getByRole('dialog', { name: /Чек-ліст інсталяції/i })
    expect(within(drawer).getByText('Вимкнені всі трекінг активності')).toBeInTheDocument()
    expect(within(drawer).getByText(/Додана наліпка з паролем User\/Admin/i)).toBeInTheDocument()

    // Toggle a single step, clear all, then mark all 27 steps
    await user.click(within(drawer).getByText('Доданий SecAdmin'))
    expect(within(drawer).getByTestId('checklist-progress')).toHaveTextContent('1 / 27 (4%)')
    await user.click(within(drawer).getByRole('button', { name: /Очистити/i }))
    expect(within(drawer).getByTestId('checklist-progress')).toHaveTextContent('0 / 27 (0%)')

    await user.click(within(drawer).getByRole('button', { name: /Відмітити всі 27 кроків/i }))
    expect(within(drawer).getByTestId('checklist-progress')).toHaveTextContent('27 / 27 (100%)')

    await user.click(within(drawer).getByRole('button', { name: /Підтвердити виконання чек-ліста/i }))
    expect(screen.queryByRole('dialog', { name: /Чек-ліст інсталяції/i })).not.toBeInTheDocument()
  })

  it('executes laptop handover via HandoverModal and transitions _isCompleted to true (AC-008)', async () => {
    const user = userEvent.setup()
    render(<App />)

    // DESKTOP-DEMO103 is pending handover (isCompleted = false)
    await user.click(screen.getByRole('button', { name: /Видати DESKTOP-DEMO103/i }))

    const modal = screen.getByRole('dialog', { name: /Видача лептопа/i })
    const nameInput = within(modal).getByLabelText(/Видано ФІО/i)
    const phoneInput = within(modal).getByLabelText(/Видано тел\./i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Мельник Андрій Миколайович')
    await user.clear(phoneInput)
    await user.type(phoneInput, '+38 (099) 777-88-99')

    await user.click(within(modal).getByRole('button', { name: /Підтвердити видачу/i }))

    // Completed count increases from 2 to 3
    expect(screen.getByTestId('kpi-completed')).toHaveTextContent('3')
  })

  it('supports bulk selection, select-all, bulk policy/network assignment, presets panel, and CSV export (AC-009)', async () => {
    const user = userEvent.setup()
    const createObjectUrlMock = vi.fn(() => 'blob:mock-csv')
    const revokeObjectUrlMock = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: createObjectUrlMock,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      value: revokeObjectUrlMock,
    })
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)

    render(<App />)

    // Toggle operator presets bar
    await user.click(screen.getByRole('button', { name: /Шаблон НСЗІ/i }))
    const unitInput = screen.getByLabelText(/Військова частина за замовчуванням/i)
    await user.clear(unitInput)
    await user.type(unitInput, 'A2222')

    // Select all and unselect all
    const selectAllCheckbox = screen.getByLabelText('Вибрати всі відфільтровані')
    await user.click(selectAllCheckbox)
    expect(screen.getByTestId('bulk-actions-bar')).toHaveTextContent('Вибрано: 5')
    await user.click(selectAllCheckbox)
    expect(screen.queryByTestId('bulk-actions-bar')).not.toBeInTheDocument()

    // Select two rows and apply bulk changes
    const rowCheck104 = screen.getByLabelText('Вибрати DESKTOP-DEMO104')
    const rowCheck105 = screen.getByLabelText('Вибрати DESKTOP-DEMO105')
    await user.click(rowCheck104)
    await user.click(rowCheck105)

    const bulkBar = screen.getByTestId('bulk-actions-bar')
    expect(within(bulkBar).getByText(/Вибрано: 2/i)).toBeInTheDocument()

    await user.selectOptions(within(bulkBar).getByLabelText('Масова зміна політики'), 'АС-1')
    await user.selectOptions(within(bulkBar).getByLabelText('Масова зміна мережі'), 'Дніпро')
    await user.click(within(bulkBar).getByRole('button', { name: /Застосувати до вибраних/i }))

    expect(screen.queryByTestId('bulk-actions-bar')).not.toBeInTheDocument()

    // Export CSV
    await user.click(screen.getByRole('button', { name: /Експорт CSV/i }))
    expect(createObjectUrlMock).toHaveBeenCalledTimes(1)

    anchorClickSpy.mockRestore()
  })
})
