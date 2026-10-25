# ADR-0002: Use Google Identity Services (GIS) OAuth 2.0 Token Model for Authentication & Authorization

**Date**: 2026-10-25
**Status**: accepted
**Deciders**: Eugene Garkavtcev, Antigravity Architect

## Context

Because the application is a frontend-only SPA communicating directly with the Google Sheets REST API v4, we cannot embed a service account private key in client-side JavaScript (which would expose credentials to anyone inspecting the bundle). Furthermore, the spreadsheet tracks which operator created each provisioning record in column `AB` (`CreatedBy`, e.g., `operator@army.mil.gov.ua`), and access to the master spreadsheet must respect each operator's Google account permissions.

## Decision

We use **Google Identity Services (GIS) OAuth 2.0 Token Client (`google.accounts.oauth2.initTokenClient`)** in the browser with least-privilege scopes:
- `https://www.googleapis.com/auth/spreadsheets` (read/write access to spreadsheets the user has permission to access)
- `openid email profile` (to identify the signed-in operator and automatically populate `CreatedBy` in column `AB`)

Access tokens are kept in memory (never persisted in plaintext `localStorage` where XSS could exfiltrate long-lived secrets) and refreshed via silent token requests when nearing expiration.

## Alternatives Considered

### Alternative 1: Google Cloud Service Account Key in Frontend `.env`
- **Pros**: No user sign-in prompt required.
- **Cons**: Catastrophic security vulnerability — bundling a service account private key into a public web app exposes the spreadsheet to unauthorized public access, and all edits appear under a single bot identity instead of the individual operator (`CreatedBy`).
- **Why not**: Violates security-first principles and loses per-operator auditability.

### Alternative 2: Backend OAuth 2.0 Authorization Code Flow with HttpOnly Session Cookies
- **Pros**: Supports refresh tokens stored server-side.
- **Cons**: Requires running and securing a stateful backend proxy server.
- **Why not**: We explicitly chose a frontend-only architecture (ADR-0001); GIS implicit/token client flow is Google's official standard for browser-only SPAs calling Google APIs directly.

## Consequences

### Positive
- **Zero secrets in client bundle:** Only the public OAuth 2.0 Client ID (`VITE_GOOGLE_CLIENT_ID`) and Spreadsheet ID (`VITE_SPREADSHEET_ID`) are configured.
- **Automatic operator attribution:** `CreatedBy` (column `AB`) is automatically populated from the authenticated user's verified Google email.
- **Google Drive ACL enforcement:** Users without Google Drive access to the master spreadsheet receive `403 Forbidden` from the Sheets API, even if they know the app URL.

### Negative
- **1-hour token lifetime:** Browser OAuth access tokens expire after 3,600 seconds and require a silent or interactive GIS token refresh.

### Risks
- **Mid-edit token expiration:** Mitigated by tracking `expiresAt` in the auth store, triggering a proactive token refresh 5 minutes before expiry, and queuing unsaved inline edits in memory/IndexedDB until the new token is acquired.

