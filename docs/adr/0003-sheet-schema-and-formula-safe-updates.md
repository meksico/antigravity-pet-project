# ADR-0003: Enforce Client-Side Schema Normalization and Formula-Safe Range Writes for `Список звітності`

**Date**: 2026-10-25
**Status**: accepted
**Deciders**: Eugene Garkavtcev, Antigravity Architect

## Context

Inspection of the production workbook (`ЦРЦТіЦ, Облік опрацьованіх лептопів.xlsx`) revealed specific structural mechanics and data-hygiene challenges in `Список звітності` (columns `A`..`AB`):
1. **Array Formula in Column `F` (`_isCompleted`):** Cell `F2` contains an array formula (`=IF(ROW(C2:C1024)<=MAX(ROW(C2:C1024)*(C2:C1024<>"")), C2:C1024<>"", "")`) that dynamically evaluates completion status across rows based on whether `Дата/час видачі` (`C`) is non-empty. Writing a literal boolean or string into `F2:F` via the Sheets API would overwrite or break the spreadsheet's formula.
2. **Inconsistent Field Formatting:** Existing rows contain float-formatted integer IDs (`"8.0"`, `"27.0"`), mixed MAC address separators (`80:13:16:7D:48:3A` vs `08-B4-D2-56-F0-90`), mixed Ukrainian/Russian spelling in `Мережа локальна` (`ІСД-Інтернет` vs `ІСД-Интернет`), and mixed boolean representations in `Чек-ліст інсталляціі` (`"true"`, `"1"`, `""`).
3. **Reference Lists in `_списки`:** Columns `G`, `H`, `I`, `J`, `K`, `L`, `N`, `U`, and `Y` use data validation backed by the `_списки` sheet.

## Decision

We adopt a **two-layer client-side data normalization + split-range write strategy**:
1. **Read-time & Write-time Zod Schema Normalization:**
   - Parse and coerce `ID` (`A`) and `Инв.н.` (`M`) as clean integers/strings (stripping `.0`).
   - Normalize `WiFi MAC` (`S`) to uppercase colon-separated format (`XX:XX:XX:XX:XX:XX`).
   - Validate `ESET ProductInstanceID` (`T`) as a lowercase UUID.
   - Normalize `Чек-ліст інсталляціі` (`AA`) from `"true" | "1" | true` into boolean `true`/`false` in UI state, and write `"TRUE"`/`"FALSE"` with `valueInputOption: "USER_ENTERED"`.
   - Normalize `Мережа локальна` (`Z`) default suggestions (e.g., standardizing `ІСД-Интернет` → `ІСД-Інтернет`).
2. **Formula-Safe Split-Range Writes (`A..E` and `G..AB`):**
   - When updating or appending a record in `Список звітності`, we write columns `A:E` and `G:AB` (via `spreadsheets.values.batchUpdate`) or pass `null`/skip column `F` (`_isCompleted`) so that cell `F2`'s array formula is never overwritten.
   - In the UI, `_isCompleted` is computed deterministically from `Boolean(issuedAt)` (`Дата/час видачі`) and reconciled with column `F` on read.

## Alternatives Considered

### Alternative 1: Overwrite Full Row `A{row}:AB{row}` Including Column `F`
- **Pros**: Single contiguous range per row update.
- **Cons**: Overwrites cell `F2` (destroying the array formula for the entire sheet) or causes `#REF!` array expansion errors in Google Sheets when literal values collide with an array formula spill range.
- **Why not**: Breaks compatibility with users viewing the sheet directly in Google Sheets.

### Alternative 2: Store All Data as Unvalidated Raw Strings
- **Pros**: Zero validation code on the client.
- **Cons**: Perpetuates duplicate filter buckets (`ІСД-Інтернет` vs `ІСД-Интернет`), broken MAC searches (`:` vs `-`), and float IDs (`8.0`).
- **Why not**: Defeats a primary benefit of building a dedicated UI over the spreadsheet.

## Consequences

### Positive
- **100% backward compatibility with the existing Google Sheet:** The array formula in `F2` and all 9 data-validation ranges pointing to `_списки` continue to work natively in Google Sheets.
- **Clean filtering and search:** MAC address search works regardless of whether the user pastes `08-B4-D2-56-F0-90` or `08:b4:d2:56:f0:90`.

### Negative
- **Slightly more complex Sheets API write payload:** Row updates emit two contiguous cell ranges (`Список звітності!A{row}:E{row}` and `Список звітності!G{row}:AB{row}`) inside a single `values.batchUpdate` HTTP request.

### Risks
- **Schema evolution if columns are reordered in Google Sheets:** Mitigated by validating header row `A1:AB1` on initial load and alerting the operator if column headers in `Список звітності` do not match the expected schema.

