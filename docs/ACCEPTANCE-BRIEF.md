# Acceptance Brief & Implementation Plan: Laptop Provisioning & Security Configuration Accounting Tool (`Облік опрацьованих лептопів`)

**Status:** Approved  
**Revision:** 1  
**Prepared for:** Core Engineering Team & Frontend Implementation Agents  
**Methodology:** ECC [`intent-driven-development`](../.agents/skills/intent-driven-development/SKILL.md) + [`planner`](../.agents/agents/planner.md)  
**Approval required before risky work:** Yes — Multi-operator sheet concurrency and Column `F` (`_isCompleted`) array formula write-safety must be enforced before writing to the production Google Sheet.

## Revision Log

| Rev | Date | Changed criteria | Reason |
| --- | --- | --- | --- |
| 1 | 2026-10-25 | — | Initial comprehensive brief and phased implementation plan based on `.xlsx` master workbook audit and user requirements. |

---

## 1. Goal

Provide an authenticated, client-side React 19 SPA that enables technical operators to securely inventory, configure, verify through a 27-step security baseline checklist (`Чек-ліст`), and record the handover of laptops directly against a shared Google Sheets master database (`Список звітності`, `_списки`) with automatic operator audit attribution (`CreatedBy`) and zero server-side infrastructure.

---

## 2. Scope

### In Scope
- **Client-Side Architecture:** Zero-backend SPA built with React 19, Vite, and TypeScript ([ADR-0001](./adr/0001-frontend-only-spa-with-google-sheets-backend.md)).
- **Identity & Access Control:** Google Identity Services (GIS) OAuth 2.0 token flow with Google Sheets read/write permissions and authenticated operator email attribution in Column `AB` (`CreatedBy`) ([ADR-0002](./adr/0002-google-identity-services-oauth2-auth.md)).
- **Data Persistence:** Google Sheets REST API v4 direct browser integration targeting master sheet `Список звітності` (28 columns `A`..`AB`), checklist sheet `Чек-ліст` (`A1:A27`), and lookup dictionary sheet `_списки` (`A1:I25`).
- **Data Hygiene Pipeline:** Automatic sanitization on read and write for legacy formatting anomalies ([ADR-0003](./adr/0003-sheet-schema-and-formula-safe-updates.md)):
  - `ID` (Col `A`) & `Инв.н.` (Col `M`) integer string normalization (`"8.0"` → `"8"`, `"27.0"` → `"27"`).
  - `WiFi MAC` (Col `S`) delimiter canonicalization (`08-B4-D2-56-F0-90` → `08:B4:D2:56:F0:90`).
  - `ESET ProductInstanceID` (Col `T`) UUID v4 lowercase validation.
  - `Мережа локальна` (Col `Z`) spelling harmonization (`"ІСД-Интернет"` → `"ІСД-Інтернет"`).
  - `Чек-ліст інсталляціі` (Col `AA`) boolean coercion (`"true" | "1" | 1` → `true`).
- **Formula Protection:** Strict isolation of Column `F` (`_isCompleted`), preventing any overwrite of cell `F2`'s array formula (`=IF(ROW(C2:C1024)<=MAX(ROW(C2:C1024)*(C2:C1024<>"")), C2:C1024<>"", "")`).
- **Interactive Grid UI:** High-performance tabular data grid with multi-column filtering, fast search across `Імʼя ПЕОМ` (Col `R`), `WiFi MAC` (Col `S`), `Инв.н.` (Col `M`), `Відповідальний` (Col `O`), and `ESET ProductInstanceID` (Col `T`), inline editing, and bulk operations.
- **Workflow Modules:**
  - Intake modal with auto-increment ID (`MAX(ID) + 1`), intake timestamp (`Дата/час прийняття`, Col `B`), and operator presets for `НСЗІ` officer fields (`V`, `W`, `X`) and `Військова частина` (`U`).
  - Interactive 27-step security installation checklist drawer (`Чек-ліст!A1:A27`) updating Column `AA` (`Чек-ліст інсталляціі`).
  - Handover execution modal (`Дата/час видачі` Col `C`, `Видано ФІО` Col `D`, `Видано тел.` Col `E`).
  - Bulk operations toolbar (bulk handover, bulk policy/unit/network update).

### Out of Scope
- Dedicated backend proxy or Node.js/Python server (pure client-to-Google Sheets REST API v4 architecture).
- Separate SQL/NoSQL database (Google Spreadsheet remains the single source of truth).
- Fetching or displaying Column `B` of `Чек-ліст` (to ensure local admin setup notes/credentials are never exposed in the web client).

---

## 3. Context

### Discovered Technical Facts (Repository & `.xlsx` Workbook Audit)
- **Repository Setup:** Vite 8 + React 19 + TypeScript 6.0.
- **Master Sheet Structure (`Список звітності`):** 28 columns (`A` through `AB`), ~1,024 rows:
  - `A`: `ID`, `B`: `Дата/час прийняття`, `C`: `Дата/час видачі`, `D`: `Видано ФІО`, `E`: `Видано тел.`, `F`: `_isCompleted`, `G`: `Підрозділ`, `H`: `Місцезнаходження`, `I`: `Опис ПЕОМ`, `J`: `Мережа`, `K`: `Тип оновлення`, `L`: `ГОД`, `M`: `Инв.н.`, `N`: `Тип АС`, `O`: `Відповідальний`, `P`: `Звання відповідального`, `Q`: `Тел. відповідального`, `R`: `Імʼя ПЕОМ`, `S`: `WiFi MAC`, `T`: `ESET ProductInstanceID`, `U`: `Військова частина`, `V`: `НСЗІ звання`, `W`: `НСЗІ ФІО`, `X`: `НСЗІ тел`, `Y`: `Політика`, `Z`: `Мережа локальна`, `AA`: `Чек-ліст інсталляціі`, `AB`: `CreatedBy`.
- **Master Lookup Dictionaries (`_списки`):** 9 reference columns (`A`: `Мережа`, `B`: `Тип оновлення`, `C`: `ГОД`, `D`: `Тип АС`, `E`: `Підрозділ`, `F`: `Місцезнаходження`, `G`: `Опис ПЕОМ`, `H`: `Військова частина`, `I`: `Політика`) bound via 9 Excel/Sheets Data Validation rules on `Список звітності`.
- **Checklist Sheet (`Чек-ліст`):** 27 rows in `A1:A27` representing the mandatory Windows & ESET security configuration steps.
- **Formula Integrity Constraint:** Cell `F2` contains an array formula computing `_isCompleted` from whether `C2:C1024` (`Дата/час видачі`) is non-empty.

### Product & Business Constraints
- **Operator Accountability:** Every newly created record must stamp the authenticated operator's Google email into Column `AB` (`CreatedBy`).
- **Zero Real PII or Credentials in Repository:** Raw `.xlsx` files are ignored via `.gitignore`. Only synthetic fixtures (`DESKTOP-DEMO01`, `00:1A:2B:3C:4D:5E`, `A0000`, `operator@example.org`, `+380990000000`) may appear in code, tests, or documentation.

---

## 4. Risk Review Table

| Risk Area | Applies? | Required Handling & Mitigations |
| --- | --- | --- |
| **Security & Privacy** | **Yes** | Store OAuth 2.0 access tokens exclusively in memory; never persist tokens to `localStorage`. Read only `Чек-ліст!A1:A27` (never `B:B`). Ignore `*.xlsx` and `.env` in Git. |
| **Persistent Data & Formulas** | **Yes** | Column `F` (`_isCompleted`) array formula in `F2` will break if overwritten. All row updates/insertions must write disjoint ranges (`A{row}:E{row}` and `G{row}:AB{row}`) via `values.batchUpdate`, skipping Column `F`. |
| **Data Hygiene & Types** | **Yes** | Normalize float strings (`"8.0"` → `"8"`), MAC delimiters (`-` → `:`), mixed spelling (`ІСД-Интернет` → `ІСД-Інтернет`), and boolean strings (`"1"`/`"true"` → `true`). |
| **External API Quota & Rate Limits** | **Yes** | Google Sheets API v4 enforces 60 requests/min/user. Batch initial reads into a single `values.batchGet` call and bundle multi-range writes into `values.batchUpdate` with a token-bucket limiter. |
| **UX & Accessibility** | **Yes** | Virtualized grid navigation, keyboard shortcuts, clear sync indicators, and WCAG 2.2 AA contrast/focus rings. |

---

## 5. Acceptance Criteria (`AC-001` through `AC-010`)

### AC-001: Google Identity Services (GIS) OAuth 2.0 Auth & Col `AB` (`CreatedBy`) Attribution
- **Scenario:** Unauthenticated operator opens the web app.
- **Action:** Operator clicks "Sign in with Google", completes Google OAuth consent (`spreadsheets` + `openid email profile`), and creates a laptop record.
- **Expected:**
  1. GIS token client authenticates the user and retrieves their Google profile email (e.g., `operator@example.org`).
  2. The access token is retained strictly in volatile memory.
  3. Any newly created row automatically populates Column `AB` (`CreatedBy`) with `operator@example.org`.
- **Must Not:** Persist OAuth access tokens to `localStorage` or `sessionStorage`, or allow unauthenticated API mutations.
- **Verification:** Vitest unit + MSW integration test verifying token memory isolation and `CreatedBy` in outgoing `batchUpdate` payload.
- **Priority:** Required.

### AC-002: Ingestion Normalization & Data Hygiene Engine
- **Scenario:** Grid loads raw rows from `'Список звітності'!A2:AB` containing legacy anomalies (`"8.0"` in `ID`, `"27.0"` in `Инв.н.`, `"08-B4-D2-56-F0-90"` in `WiFi MAC`, `"ІСД-Интернет"` in `Мережа локальна`, `"1"` in `Чек-ліст інсталляціі`).
- **Action:** Ingestion parser processes the raw 2D array from `values.batchGet`.
- **Expected:**
  1. `ID` (`A`) is parsed as integer `8` and `Инв.н.` (`M`) is normalized to `"27"`.
  2. `WiFi MAC` (`S`) is canonicalized to `"08:B4:D2:56:F0:90"`.
  3. `Мережа локальна` (`Z`) is normalized to `"ІСД-Інтернет"`.
  4. `Чек-ліст інсталляціі` (`AA`) is coerced to boolean `true`.
  5. Serial dates in `B` (`Дата/час прийняття`) and `C` (`Дата/час видачі`) are converted to ISO 8601 / `Europe/Kyiv` formatted strings.
- **Must Not:** Mutate unrelated fields, drop valid rows, or crash on empty optional cells.
- **Verification:** Vitest unit test suite covering `parseSheetRow()` and field normalizers with 25+ edge cases.
- **Priority:** Required.

### AC-003: Non-Destructive Column `F` (`_isCompleted`) Array Formula Isolation
- **Scenario:** Operator edits an existing laptop row (e.g., Row `14`) or appends a new row.
- **Action:** Operator saves changes in the grid, intake modal, or handover modal.
- **Expected:**
  1. The application sends a `spreadsheets.values.batchUpdate` request containing two disjoint ranges: `'Список звітності'!A14:E14` and `'Список звітності'!G14:AB14`.
  2. Column `F` (`F14`) is completely omitted from the write payload so cell `F2`'s array formula calculates `_isCompleted` automatically based on `C14` (`Дата/час видачі`).
- **Must Not:** Write any value (even `""` or `TRUE`/`FALSE`) into `F2:F`.
- **Verification:** Vitest + MSW request-payload assertion test verifying zero writes target Column `F`.
- **Priority:** Required.

### AC-004: Dynamic Reference Dictionary Synchronization from `_списки`
- **Scenario:** Operator opens a select dropdown for any of the 9 dictionary-backed columns (`Підрозділ`, `Місцезнаходження`, `Опис ПЕОМ`, `Мережа`, `Тип оновлення`, `ГОД`, `Тип АС`, `Військова частина`, `Політика`).
- **Action:** Application hydrates `_списки!A1:I25` via `values.batchGet`.
- **Expected:**
  1. Each dropdown populates its options dynamically from the matching column in `_списки`.
  2. If a legacy row holds a value not currently in `_списки`, the UI preserves the value with a warning badge rather than silently clearing it.
- **Must Not:** Hardcode dropdown lists as static constants that ignore changes in `_списки`.
- **Verification:** React Testing Library component test with mocked `_списки` payload.
- **Priority:** Required.

### AC-005: Fast Multi-Filter & Search Across `Список звітності`
- **Scenario:** Registry contains 1,000+ laptop records.
- **Action:** Operator filters by `Підрозділ`, `Мережа`, `Тип АС`, `ГОД`, and completion status (`_isCompleted`), and types a search query matching `Імʼя ПЕОМ` (`R`), `WiFi MAC` (`S`, supporting both `:` and `-` in search input), `Инв.н.` (`M`), `Відповідальний` (`O`), or `ESET ProductInstanceID` (`T`).
- **Expected:**
  1. Table updates filtered rows in `< 50ms` without additional network calls.
  2. KPI summary counters reflect total vs. filtered counts, completed (`Видано`), and in-progress (`В роботі`) devices.
- **Must Not:** Trigger Google Sheets API calls on filter/search keystrokes.
- **Verification:** Vitest + RTL filter & search benchmark test over 1,500 synthetic records.
- **Priority:** Required.

### AC-006: New Laptop Intake with Auto-ID, Serial Timestamp & Operator Presets
- **Scenario:** Operator receives a new laptop for provisioning.
- **Action:** Operator opens "Новий лептоп" (New Intake), fills required fields (with pre-filled defaults for `НСЗІ звання/ФІО/тел` and `Військова частина` from operator presets), and submits.
- **Expected:**
  1. `ID` (`A`) is calculated as `MAX(existing IDs) + 1`.
  2. `Дата/час прийняття` (`B`) is set to the current timestamp (serialized as Google Sheets serial date or ISO string via `USER_ENTERED`).
  3. `CreatedBy` (`AB`) is set to the authenticated operator's email.
  4. Disjoint write inserts `A{nextRow}:E{nextRow}` and `G{nextRow}:AB{nextRow}`.
- **Must Not:** Allow submission with invalid `WiFi MAC` or malformed `ESET ProductInstanceID` (when provided).
- **Verification:** RTL + MSW integration test for intake form submission.
- **Priority:** Required.

### AC-007: Interactive 27-Step `Чек-ліст` Drawer & Column `AA` Synchronization
- **Scenario:** Operator clicks the Checklist button on a laptop row.
- **Action:** Drawer displays all 27 steps loaded from `Чек-ліст!A1:A27`; operator checks off all 27 steps and clicks "Підтвердити виконання чек-ліста".
- **Expected:**
  1. Only Column `A` (`Чек-ліст!A1:A27`) is fetched and displayed (Column `B` is never fetched or rendered).
  2. Progress bar updates as steps are checked (`27 / 27 — 100%`).
  3. Confirming completion updates Column `AA` (`Чек-ліст інсталляціі`) to `TRUE` in `Список звітності`.
- **Must Not:** Fetch or expose `Чек-ліст!B:B` in network requests or DOM.
- **Verification:** RTL component test + MSW range check asserting `Чек-ліст!A1:A30` (only column `A`) is requested.
- **Priority:** Required.

### AC-008: Handover Workflow (`Дата/час видачі`, `Видано ФІО`, `Видано тел.`)
- **Scenario:** A provisioned laptop is handed over to its recipient.
- **Action:** Operator clicks "Видати", enters `Видано ФІО` (`D`), `Видано тел.` (`E`), and confirms `Дата/час видачі` (`C`, defaulting to current date/time).
- **Expected:**
  1. Range `'Список звітності'!C{row}:E{row}` is updated in Google Sheets.
  2. UI immediately reflects `_isCompleted = true` (since `Дата/час видачі` is now populated).
  3. Warn operator if `Чек-ліст інсталляціі` (`AA`) is not yet `true` before completing handover.
- **Must Not:** Overwrite intake timestamp (`B`) or Column `F`.
- **Verification:** RTL + MSW integration test for handover modal.
- **Priority:** Required.

### AC-009: Quota-Safe Bulk Actions (`values.batchUpdate`)
- **Scenario:** Operator selects multiple rows (e.g., 10 laptops from the same subdivision) to issue simultaneously or update `Політика` / `Мережа`.
- **Action:** Operator uses the Bulk Actions toolbar and confirms.
- **Expected:**
  1. All row updates are combined into a **single** `spreadsheets.values.batchUpdate` HTTP call.
  2. Optimistic UI updates all selected rows and rolls back cleanly if the batch call fails.
- **Must Not:** Issue N separate HTTP requests for N selected rows.
- **Verification:** Vitest + MSW test asserting 1 HTTP request for multi-row batch update.
- **Priority:** Important.

### AC-010: Pre-Write Row ID Guard & Resilient Error Handling
- **Scenario:** Operator saves an edit to Row `N`, or OAuth token expires mid-session.
- **Action:** Client executes pre-write check or handles HTTP `401`/`403`/`429`.
- **Expected:**
  1. Before updating Row `N`, verify `Список звітності!A{N}` matches expected `record.id` to prevent overwriting a shifted row.
  2. On `429 Too Many Requests`, retry with exponential backoff + jitter.
  3. On `401 Unauthorized`, prompt silent/interactive GIS token re-authentication without losing unsaved form edits.
- **Must Not:** Silently swallow API errors or overwrite a mismatched row ID.
- **Verification:** Vitest failure-injection tests for ID mismatch, `401`, `403`, and `429`.
- **Priority:** Required.

---

## 6. Blocking Decisions (Resolved)

- [x] **BD-001 (Column `F` Array Formula Preservation):** Use disjoint range writes (`A{row}:E{row}` and `G{row}:AB{row}`) via `values.batchUpdate` ([ADR-0003](./adr/0003-sheet-schema-and-formula-safe-updates.md)).
- [x] **BD-002 (Authentication Mechanism):** Use Google Identity Services (GIS) OAuth 2.0 Token Client in memory ([ADR-0002](./adr/0002-google-identity-services-oauth2-auth.md)).
- [x] **BD-003 (Sensitive Notes in `Чек-ліст!B2`):** Only request range `Чек-ліст!A1:A30` (Column `A` step titles) so Column `B` is never loaded into the browser.

---

## 7. Phased Implementation Roadmap

### Phase 1: Foundation, Zod Schemas & Normalization Engine (TDD)
- Install `zod`, `@tanstack/react-query`, `@tanstack/react-table`, `lucide-react`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `msw`.
- Implement `src/schemas/laptopRecordSchema.ts`, `src/services/converters/dateConverter.ts`, `src/services/converters/normalizers.ts`, and `src/services/sheets/sheetsFormulaGuard.ts` with 90%+ unit test coverage (`AC-002`, `AC-003`).

### Phase 2: Google Identity Services (GIS) OAuth 2.0 & Sheets API v4 Client
- Implement `AuthProvider` with in-memory token store, operator profile extraction (`CreatedBy`), and silent expiry refresh (`AC-001`).
- Implement `sheetsClient.ts` (`batchGet`, disjoint `batchUpdate`, pre-write ID guard, token-bucket rate limiter, exponential backoff) and MSW mock handlers (`AC-003`, `AC-010`).
- Provide a built-in **Demo / Sandbox Mode** (with synthetic data matching the 28-column schema) when `VITE_GOOGLE_CLIENT_ID` is not yet configured, allowing immediate local preview and E2E testing.

### Phase 3: Interactive Provisioning Data Grid & `_списки` Dictionaries
- Build `RegistryKpiBar`, `RegistryFilterBar` (search + dropdown filters from `_списки`), and `RegistryGrid` (28 columns with status badges, MAC/UUID copy buttons, and inline editing) (`AC-004`, `AC-005`).

### Phase 4: Intake Modal, 27-Step `Чек-ліст` Drawer, Handover & Bulk Actions
- Build `IntakeModal` with operator presets (`НСЗІ` officer defaults, `Військова частина`, auto-ID) (`AC-006`).
- Build `ChecklistDrawer` (`Чек-ліст!A1:A27` → Column `AA`) (`AC-007`).
- Build `HandoverModal` (`Дата/час видачі`, `Видано ФІО`, `Видано тел.`) and `BulkActionsBar` (`AC-008`, `AC-009`).

### Phase 5: Verification Loop, Accessibility & Production Build
- Run full ECC [`verification-loop`](../.agents/skills/verification-loop/SKILL.md) (TypeScript check, Oxlint, Vitest coverage $\ge 80\%$, security scan, production build).
