# Product Brief: Laptop Provisioning & Security Configuration Accounting Tool (`Облік опрацьованих лептопів`)

**Date:** 2026-10-25  
**Methodology:** ECC [`product-lens`](./.agents/skills/product-lens/SKILL.md) (Mode 1: Product Diagnostic & Mode 4: ICE Feature Prioritization)  
**Verdict:** **GO** — Clear operational pain point, well-defined schema from an active 1,000+ row workbook, zero backend hosting overhead.

---

## 1. Product Diagnostic (The 7 Questions)

### 1. Who is this for?
- **Primary Operators:** IT & InfoSec provisioning specialists (ЦРЦТіЦ / НСЗІ personnel) who receive, harden, configure, and issue laptops/workstations (`ПЕОМ`) across organizational subdivisions.
- **Secondary Consumers:** Unit leads and InfoSec officers auditing which workstations have been issued, which security policies (`Політика`) and ESET endpoint instances (`ESET ProductInstanceID`) are active, and which devices are still in provisioning vs. handed over (`_isCompleted`).

### 2. What is the pain?
Currently, operators manage provisioning directly inside a raw multi-tab spreadsheet (`Список звітності`, `Чек-ліст`, `_списки`) with 28 columns (`A` through `AB`). Editing raw spreadsheet rows directly causes concrete operational friction and data-quality issues discovered in the workbook:
- **Formatting & Data Hygiene Drift:**
  - Numeric IDs and inventory numbers (`Инв.н.`) drift into float strings (`"8.0"`, `"27.0"`).
  - Wi-Fi MAC addresses (`WiFi MAC`) are entered with inconsistent delimiters (`80:13:16:7D:48:3A` vs `08-B4-D2-56-F0-90`) or omitted.
  - Local network names (`Мережа локальна`) have mixed spelling (`ІСД-Інтернет` vs `ІСД-Интернет`).
  - Boolean flags (`Чек-ліст інсталляціі`, `_isCompleted`) mix `"true"`, `"1"`, and formulas.
- **Fragile Array Formulas:** Column `F` (`_isCompleted`) relies on an array formula in `F2` (`=IF(ROW(C2:C1024)<=MAX(ROW(C2:C1024)*(C2:C1024<>"")), C2:C1024<>"", "")`) that can easily be broken if an operator edits or sorts column `F` manually.
- **Disconnected 27-Step Hardening Checklist:** The 27-step provisioning checklist (`Чек-ліст` tab) is static and disconnected from the per-laptop row state (`Чек-ліст інсталляціі` in column `AA`).
- **Repetitive Data Entry:** Operators repeatedly type or copy the same InfoSec officer details (`НСЗІ звання`, `НСЗІ ФІО`, `НСЗІ тел`), unit codes, and operator emails (`CreatedBy`).

### 3. Why now?
The workbook already has a mature, proven 28-column schema (`Список звітності`) and 9 standardized reference dictionaries (`_списки`). Wrapping the existing Google Spreadsheet in a purpose-built React + TypeScript web interface with Google OAuth 2.0 preserves the familiar Google Sheets database while immediately adding schema validation, fast filtering, bulk updates, and an interactive provisioning workflow without standing up or maintaining custom backend servers.

### 4. What is the 10-star version?
- Instantaneous keyboard-first data grid with smart presets (auto-filling `CreatedBy` from Google OAuth, remembering the active operator's default `НСЗІ` officer and `Військова частина` defaults, one-click timestamp buttons for `Дата/час прийняття` and `Дата/час видачі`).
- Interactive 27-step provisioning checklist drawer per workstation that tracks step completion and automatically sets `Чек-ліст інсталляціі = TRUE`.
- Automatic MAC address (`XX:XX:XX:XX:XX:XX`), UUID (`ESET ProductInstanceID`), and phone number normalization on paste.
- Offline-resilient local cache (IndexedDB + optimistic updates) with conflict-safe cell range writes to Google Sheets API v4.

### 5. What is the MVP?
A **Frontend-only Single-Page Application (React + Vite + TypeScript)** connected directly to the shared master Google Spreadsheet via **Google OAuth 2.0 (Google Identity Services)** and **Google Sheets REST API v4**:
1. **Google OAuth 2.0 Sign-In:** Authenticates the operator, retrieves their email for `CreatedBy` (`AB`), and uses their OAuth access token to read/write the master Google Spreadsheet according to Google Drive permissions.
2. **Dynamic Reference Dictionaries (`_списки`):** Loads the 9 lookup columns (`Мережа`, `Тип оновлення`, `ГОД`, `Тип АС`, `Підрозділ`, `Місцезнаходження`, `Опис ПЕОМ`, `Військова частина`, `Політика`) to power validated select dropdowns.
3. **Interactive Provisioning Grid (`Список звітності`):**
   - Multi-column search & filters (by `Підрозділ`, `Мережа`, `Тип АС`, `ГОД`, completion status `_isCompleted`, and text search across `Імʼя ПЕОМ`, `WiFi MAC`, `Инв.н.`, `Відповідальний`, `ESET ProductInstanceID`).
   - Inline editing and modal/drawer form with strict validation & normalization (MAC address, ESET UUID, phone, integer ID/Inventory #) and formula-safe writes (skipping column `F` so the sheet's `_isCompleted` formula remains intact).
   - Bulk actions (bulk handover timestamping, bulk unit/policy assignment).
4. **27-Step Provisioning Checklist Drawer (`Чек-ліст`):** Interactive step-by-step checklist for operators that marks `Чек-ліст інсталляціі` (`AA`) complete when verified.

### 6. What is the Anti-Goal (Explicitly Out of Scope)?
- **No custom backend server or separate SQL database:** Google Sheets remains the single source of truth so existing spreadsheet workflows and Google Drive access controls continue working seamlessly.
- **No plaintext password storage in application code or public sheets:** Any sensitive local admin credentials (such as local account setup notes in `Чек-ліст`) must never be hardcoded in the repository or exposed to unauthenticated users.
- **No full ERP/financial accounting:** This tool is strictly focused on **IT asset / laptop provisioning and security hardening accounting**.

### 7. How do we know it's working (Success Metrics)?
- **Zero malformed entries** for `WiFi MAC`, `ESET ProductInstanceID`, and integer `ID` / `Инв.н.` on new or edited rows.
- **< 30 seconds** to log a newly received laptop or complete a laptop handover (`Дата/час видачі`, `Видано ФІО`, `Видано тел.`).
- **Zero formula overwrites** on column `F` (`_isCompleted`).

---

## 2. ICE Feature Prioritization

| Rank | Feature | Impact (1-5) | Confidence (1-5) | Effort (1-5) | ICE Score `(I×C)/E` | Target Phase |
|------|---------|:------------:|:----------------:|:------------:|:-------------------:|--------------|
| 1 | **Google OAuth 2.0 (GIS) + Google Sheets API v4 Client** (`batchGet` / `batchUpdate` / `append`) | 5 | 5 | 2 | **12.5** | Phase 1–2 |
| 2 | **Interactive Data Grid for `Список звітності`** (filtering, search, sorting, status badges) | 5 | 5 | 2 | **12.5** | Phase 3 |
| 3 | **Schema Normalization & Formula-Safe Row Editor** (MAC/UUID validation, `_списки` dropdowns, auto `CreatedBy`) | 5 | 5 | 2 | **12.5** | Phase 3 |
| 4 | **One-Click Handover & Bulk Actions** (`Дата/час видачі`, `Видано ФІО`, bulk policy/unit update) | 4 | 5 | 2 | **10.0** | Phase 4 |
| 5 | **Interactive 27-Step `Чек-ліст` Drawer** tied to `Чек-ліст інсталляціі` (col `AA`) | 4 | 4 | 2 | **8.0** | Phase 4 |
| 6 | **KPI Summary Bar** (Total Processed, In Progress vs. Issued, Breakdown by Unit / Network) | 3 | 5 | 2 | **7.5** | Phase 4 |

