# PMO Hub frontend

Frontend-прототип системи управління стратегічним портфелем та операційними задачами на React, TypeScript і Vite.

## Локальний запуск

Потрібні Node.js 20+ та npm.

```bash
npm ci
npm run dev
```

Після запуску відкрийте [http://localhost:3000](http://localhost:3000). Для demo-користувачів використовуйте пароль `password123`.

Дані зберігаються лише у стані React. Перезавантаження сторінки відновлює узгоджений набір даних із `src/demoData.ts` та повертає екран входу.

## Перевірка

```bash
npm run typecheck
npm run test
npm run build
npm run preview
```

Імпорт підтримує лише JSON-схему версії `3.0` з річними snapshots. ExcelJS завантажується окремо лише після натискання кнопки Excel export.
