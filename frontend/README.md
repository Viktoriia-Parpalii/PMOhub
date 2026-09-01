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

Backup/recovery та Excel export не входять до поточного релізу. Майбутній Excel export буде спроєктовано окремо на основі актуальних server-side read models.

Проєкт використовує npm і `package-lock.json` як єдиний package manager contract. `npm run test:e2e` запускає Playwright smoke-тести; `npm run check:bundle` перевіряє бюджет initial JS у 500 KB.
