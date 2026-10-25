# ADR-0001: Use Frontend-Only React SPA with Google Sheets REST API v4 as Backend & Database

**Date**: 2026-10-25
**Status**: accepted
**Deciders**: Eugene Garkavtcev, Antigravity Architect

## Context

The Laptop Provisioning & Security Configuration Accounting Tool (`Облік опрацьованих лептопів`) manages ~1,000+ workstation provisioning records across three tabs (`Список звітності`, `Чек-ліст`, `_списки`) in a shared master Google Spreadsheet. Operators and stakeholders already rely on Google Drive permissions and spreadsheet access for reporting, auditing, and ad-hoc inspection. We need a rich, validated web UI (filtering, inline editing, bulk actions, checklist tracking) without introducing infrastructure maintenance costs or migrating data away from Google Sheets.

## Decision

We build the application as a **frontend-only Single-Page Application (React 19 + Vite + TypeScript)** that communicates directly with the **Google Sheets REST API v4** (`spreadsheets.values.batchGet`, `spreadsheets.values.batchUpdate`, `spreadsheets.values.append`) from the user's browser.

## Alternatives Considered

### Alternative 1: Custom Backend API + Relational Database (Node.js / FastAPI + PostgreSQL / Supabase)
- **Pros**: Full SQL querying, row-level locking, custom server-side business logic, and high-throughput indexing.
- **Cons**: Requires hosting, database migrations, separate access-control management, and two-way synchronization if stakeholders still expect the master Google Spreadsheet to stay updated.
- **Why not**: Overkill for a ~1,000–5,000 row provisioning registry where the team explicitly wants the Google Spreadsheet to remain the canonical database.

### Alternative 2: Google Apps Script (`google.script.run`) Embedded Web App
- **Pros**: Runs inside the Google Workspace context of the spreadsheet with server-side Apps Script triggers.
- **Cons**: Severe execution quotas (6-minute execution limit, limited concurrent requests), slow RPC cold-starts, iframe sandboxing restrictions, and poor developer ergonomics for modern React + TypeScript + Vite workflows.
- **Why not**: Direct Google Sheets REST API v4 calls from a standalone React + Vite SPA are significantly faster, easier to test with Vitest/Playwright, and deployable to any static host (GitHub Pages, Cloudflare Pages, Vercel).

## Consequences

### Positive
- **Zero backend infrastructure cost:** Can be hosted as static assets on GitHub Pages or any static CDN.
- **Single source of truth:** All reads and writes go directly to the master Google Spreadsheet (`Список звітності`, `Чек-ліст`, `_списки`).
- **Native access control:** Google Drive ACLs on the spreadsheet automatically govern who can view or edit records.

### Negative
- **No row-level ACID transactions:** Concurrent edits by multiple operators rely on row index positioning (`A{row}:AB{row}`).
- **Google Sheets API rate limits:** Limited to 60 read/write requests per minute per user per project.

### Risks
- **Row-shift race condition if rows are physically deleted:** Mitigated by never physically deleting rows during normal operations and by verifying the row `ID` (column `A`) before applying targeted updates, plus batching reads (`values.batchGet`) and writes (`values.batchUpdate`) via TanStack Query.

