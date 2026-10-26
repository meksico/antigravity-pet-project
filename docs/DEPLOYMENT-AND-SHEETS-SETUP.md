# Runbook: GitHub CI/CD & Google Spreadsheet Integration

Цей документ описує покрокове налаштування наступних двох етапів проєкту **«Картки обліку ПЕОМ»**:
1. **GitHub Actions CI/CD та автоматичний деплой на GitHub Pages**
2. **Інтеграція з робочою таблицею Google Sheets через Google Identity Services (OAuth 2.0)**

---

## Частина 1. Підготовка та налаштування GitHub CI/CD

У репозиторій вже додано готовий шаблон пайплайну [`docs/ci-templates/ci-deploy.yml`](./ci-templates/ci-deploy.yml), конфігурацію базового шляху у [`vite.config.ts`](../vite.config.ts) та клієнтський скрипт Google Identity Services у [`index.html`](../index.html).

> **Чому файл лежить у `docs/ci-templates/ci-deploy.yml`?** GitHub OAuth-токен без дозволу `workflow` не дозволяє створювати файли в `.github/workflows/` напряму через Git-клієнт, якщо токен не має scope `workflow`. Ви можете активувати його за 30 секунд або через веб-інтерфейс GitHub, або оновивши токен (`gh auth refresh -h github.com -s workflow`).

### Що виконує GitHub Actions Workflow (`ci-deploy.yml`)
При кожному `push` або `pull_request` у гілку `main` автоматично запускається джоба **`quality-gate`**:
1. **Security Guard**: перевіряє, щоб у Git-індекс випадково не потрапили файли `.xlsx`, `.xls` або `.env`.
2. **Лінтер**: запускає `npm run lint` (`oxlint` — 0 попереджень та помилок).
3. **Тести та покриття (80%+ Gate)**: запускає `npm run test:coverage` (`vitest` з перевіркою порогу $\ge 80\%$ для Statements, Branches, Functions, Lines).
4. **Збірка Production SPA**: виконує `npm run build` (`tsc -b && vite build`) з підстановкою змінних середовища `VITE_BASE_PATH`, `VITE_GOOGLE_CLIENT_ID` та `VITE_SPREADSHEET_ID`.
5. **Деплой на GitHub Pages** (тільки для `push` у `main`): публікує артефакт `./dist` на URL `https://meksico.github.io/antigravity-pet-project/`.

---

### Покрокова інструкція для активації CI/CD у GitHub

#### Крок 1. Увімкніть GitHub Pages через GitHub Actions
1. Відкрийте репозиторій: `https://github.com/meksico/antigravity-pet-project`
2. Перейдіть у **Settings** → **Pages** (у лівому меню).
3. У розділі **Build and deployment** → **Source** оберіть **`GitHub Actions`** (замість `Deploy from a branch`).

#### Крок 2. Додайте змінні середовища репозиторію (Repository Variables)
Оскільки `VITE_GOOGLE_CLIENT_ID` та `VITE_SPREADSHEET_ID` вбудовуються у клієнтський бандл під час збірки (вони є публічними ідентифікаторами, а доступ захищається OAuth 2.0 правами користувача на саму Google Таблицю):
1. Перейдіть у **Settings** → **Secrets and variables** → **Actions**.
2. Відкрийте вкладку **Variables** та натисніть **New repository variable**.
3. Додайте дві змінні:
   - `VITE_GOOGLE_CLIENT_ID` = `<ваш_OAuth_Client_ID>.apps.googleusercontent.com`
   - `VITE_SPREADSHEET_ID` = `<ID_вашої_Google_Таблиці>`

> **Примітка:** Навіть якщо ці змінні ще не задані, пайплайн успішно збере і задеплоїть додаток у **Демо-режимі**, а оператор зможе ввести `ID Google Таблиці` безпосередньо в інтерфейсі (кнопка **«Шаблон НСЗІ»** у верхній панелі).

#### Крок 3. Перевірте статус виконання Workflow
1. Перейдіть у вкладку **Actions** у вашому GitHub-репозиторії.
2. Переконайтесь, що workflow **CI & Deploy to GitHub Pages** світиться зеленим (`quality-gate` → `deploy-pages`).

---

## Частина 2. Інтеграція з Google Spreadsheet (Google Sheets API v4 + OAuth 2.0)

Архітектура додатку реалізує прямий зв'язок браузера з Google Sheets REST API v4 без проміжних серверів ([ADR-0001](./adr/0001-serverless-spa-google-sheets-backend.md), [ADR-0002](./adr/0002-google-identity-services-oauth-user-attribution.md), [ADR-0003](./adr/0003-preserve-sheet-array-formula-columns.md)).

### Покрокове налаштування Google Таблиці та Google Cloud

#### Крок 1. Імпорт робочої книги `.xlsx` у Google Sheets
1. Відкрийте [Google Drive](https://drive.google.com/) під обліковим записом Google, який матиме права власника таблиці.
2. Завантажте файл `ЦРЦТіЦ, Облік опрацьованіх лептопів.xlsx` та відкрийте його у **Google Таблицях**.
3. У меню оберіть **Файл → Зберегти як Таблиці Google** (*File → Save as Google Sheets*). Це створить нативну Google Таблицю.
4. Перевірте наявність трьох вкладок із точними назвами:
   - `Список звітності` (28 стовпців `A..AB`, де в комірці `F2` знаходиться формула масиву `_isCompleted`)
   - `Чек-ліст` (27 кроків у стовпці `A`)
   - `_списки` (9 довідників для випадаючих списків)
5. **Правило безпеки для аркуша `Чек-ліст`**:
   - Перевірте комірку `B2` на аркуші `Чек-ліст`. Хоча наш додаток програмно читає **виключно стовпець `A`** (`'Чек-ліст'!A1:A30`), рекомендується видалити чутливі паролі локального адміністратора з комірки `B2` у самій Google Таблиці.
6. Скопіюйте **`SPREADSHEET_ID`** з адресного рядка браузера:
   ```text
   https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit
   ```
7. Надайте доступ (**Поділитися / Share** → роль **Редактор / Editor**) обліковим записам Google тих операторів, які працюватимуть із системою.

---

#### Крок 2. Створення проєкту в Google Cloud Console та увімкнення API
1. Відкрийте [Google Cloud Console](https://console.cloud.google.com/).
2. Створіть новий проєкт (наприклад, `peom-accounting-spa`).
3. Перейдіть у **APIs & Services** → **Library**.
4. Знайдіть **Google Sheets API** та натисніть **Enable** (Увімкнути).

---

#### Крок 3. Налаштування OAuth Consent Screen (Екран згоди)
1. Перейдіть у **APIs & Services** → **OAuth consent screen** (або **Google Auth Platform** → **Branding / Audience**).
2. Оберіть тип користувачів:
   - **Internal** — якщо ви використовуєте корпоративний Google Workspace домен.
   - **External** (у режимі **Testing**) — якщо оператори використовують звичайні `@gmail.com` акаунти. У розділі **Test users** додайте email-адреси всіх операторів.
3. У розділі **Data Access / Scopes** додайте дозволи (Scopes):
   - `https://www.googleapis.com/auth/spreadsheets`
   - `openid`
   - `email`
   - `profile`

---

#### Крок 4. Створення OAuth 2.0 Web Client ID
1. Перейдіть у **APIs & Services** → **Credentials**.
2. Натисніть **+ Create Credentials** → **OAuth client ID**.
3. Оберіть **Application type**: `Web application`.
4. У полі **Authorized JavaScript origins** обов'язково додайте обидві адреси (локальну для розробки та бойову для GitHub Pages):
   - `http://localhost:5173`
   - `https://meksico.github.io`
   *(Важливо: вказуйте тільки протокол, домен і порт — без сاشів `/` чи шляхів `/antigravity-pet-project` у кінці).*
5. Натисніть **Create** та скопіюйте згенерований **Client ID** (`xxxx.apps.googleusercontent.com`).

---

#### Крок 5. Локальний запуск із реальною Google Таблицею
1. У корені проєкту створіть локальний файл `.env.local` на основі шаблону [`.env.example`](../.env.example) (файл `.env.local` додано до [`.gitignore`](../.gitignore) і ніколи не потрапить у Git):
   ```bash
   cp .env.example .env.local
   ```
2. Заповніть `.env.local` вашими значеннями:
   ```ini
   VITE_GOOGLE_CLIENT_ID=1234567890-abcdefg.apps.googleusercontent.com
   VITE_SPREADSHEET_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789
   ```
3. Запустіть локальний сервер:
   ```bash
   npm run dev
   ```
4. У верхній панелі додатку натисніть **«Шаблон НСЗІ (A0000)»** → у блоці **«Сесія оператора»** натисніть **«Google OAuth»** (або **«Увійти через Google»**).
5. Після вибору Google-акаунта:
   - Токен доступу збережеться виключно в оперативній пам'яті вкладки браузера (`useRef` у [`AuthProvider.tsx`](../src/features/auth/context/AuthProvider.tsx)).
   - Додаток автоматично завантажить усі рядки з аркуша `Список звітності`, довідники з `_списки` та 27 пунктів із `Чек-ліст!A1:A30`.
   - При створенні або редагуванні картки додаток виконає захищений запис у неперервні діапазони `A{row}:E{row}` та `G{row}:AB{row}` ([`sheetsFormulaGuard.ts`](../src/services/sheets/sheetsFormulaGuard.ts)), зберігаючи недоторканою формулу масиву в колонці `F` (`_isCompleted`), та автоматично підставить email авторизованого оператора в колонку `AB` (`CreatedBy`).
