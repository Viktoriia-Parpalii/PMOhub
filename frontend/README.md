# PMO Hub frontend

Frontend-прототип системи управління стратегічним портфелем та операційними задачами на React, TypeScript і Vite.

## Локальний запуск з backend

Потрібні Node.js 20+ та npm. Спочатку запустіть MSSQL і API за інструкцією у [backend README](../backend/README.md).

```powershell
Copy-Item .env.example .env
npm ci
npm run dev
```

Перевірте, що у `frontend/.env` задано:

```dotenv
VITE_API_URL=http://localhost:4000/api/v1
```

Після запуску відкрийте [http://localhost:3000](http://localhost:3000). У цьому режимі frontend використовує API, дані зберігаються в MSSQL, а сесія відновлюється через безпечну HttpOnly refresh-cookie. API має бути доступний на `http://localhost:4000`, а `FRONTEND_ORIGIN` у `backend/.env` — дорівнювати `http://localhost:3000`.

Frontend завжди працює через backend; автономний demo-mode більше не підтримується.

## Перевірка

```bash
npm run typecheck
npm run test
npm run build
npm run preview
```

У backend-режимі JSON backup використовує формат `6.0` без паролів, хешів і сесій. API також може імпортувати legacy формат `5.0`. ExcelJS завантажується окремо лише після натискання кнопки Excel export.
