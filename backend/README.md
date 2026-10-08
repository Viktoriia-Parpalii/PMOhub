# PMO Hub backend

Backend — це NestJS API з Prisma та Microsoft SQL Server. Повна інструкція для всього застосунку є у [кореневому README](../README.md).

### Річні записи та скоуп

`POST /api/v1/initiative-years/resume` відновлює раніше створений проєкт або операційну задачу після перерви, зокрема з архівного року, в пізнішому відкритому році. Команда використовує наявну `Initiative`, перевіряє `source_revision`, створює нові `InitiativeYear` і порожній `PreparationStage` та записує `YEAR_RESUMED`. Квартальні картки, завдання, менеджер, пріоритет і підрозділи не копіюються; архів не змінюється. Для вже наявного цільового року повертається 409.

`scope_groups` належить одній квартальній картці. `scope_items.scope_group_id` є nullable, а `scope_items.sort_order` задає порядок завдань. Контракти create/update картки приймають `scope_groups[]` і `group_id`; порядок масиву `scope[]` є канонічним. Backend перевіряє належність груп картці, унікальність назв і неперервність завдань групи; порожні групи не зберігаються.

Під час перенесення чи копіювання завдання цільова група шукається спочатку за `lineage_id`, потім за назвою без урахування регістру та крайніх пробілів. Наявна однойменна група зберігає свій `lineage_id`; нова створюється лише за відсутності обох збігів. Копія зберігає статус, визначення ваги та знімок ваги вихідного завдання. Для наявної цільової картки обов’язкова актуальна `target_revision`, а конкурентний конфлікт групи повертає 409 замість 500. Дубль `lineage_id` завдання в цілі залишається забороненим.

## 1. Локально: розробка і тестування

Виконуйте команди з каталогу `backend`.

### Налаштування

```powershell
Copy-Item .env.example .env
```

Заповніть `backend/.env`:

```dotenv
NODE_ENV=development
DATABASE_URL="sqlserver://localhost:1433;database=pmohub;schema=dbo;user=pmohub_app;password=YOUR_PASSWORD;encrypt=true;trustServerCertificate=true"
JWT_ACCESS_SECRET=випадковий-секрет-щонайменше-32-символи
JWT_REFRESH_SECRET=інший-випадковий-секрет-щонайменше-32-символи
FRONTEND_ORIGIN=http://localhost:3000
COOKIE_SECURE=false
```

База `pmohub` повинна вже існувати. Якщо SQL Server працює на іншому комп'ютері, замініть `localhost` його DNS-іменем або IP-адресою.

### Перший запуск

```powershell
npm ci
npm run db:migrate
npm run dev
```

`npm ci` автоматично генерує Prisma Client. `db:migrate` створює таблиці разом із системними ролями, правами, DEFAULT-довідниками та початковими системними налаштуваннями. Initial migration також містить таблицю історії квартальних лімітів підрозділів. `db:seed` запускайте лише опційно для першого адміністратора, попередньо заповнивши всі `BOOTSTRAP_ADMIN_*` у `.env`.

Для окремої порожньої тестової БД після міграцій можна виконати `prisma/seed-quality-test-data.sql` у SQL Server. Він додає групи скоупу, завдання в групах і пару однойменних груп із різним `lineage_id` у кварталах однієї ініціативи для ручної перевірки перенесення. Скрипт не призначений для повторного запуску чи робочої БД; після виконання виводить контрольні підсумки та приклади пар. Перед міграцією `20260918120000_add_scope_groups_and_ordering` на БД з реальними даними створіть резервну копію.

Таблиця `roles` є батьківським довідником для `users.role` і `role_permissions.role`. Роль за замовчуванням позначається `is_default`; активність ролі перевіряється під час login, refresh і авторизації запитів.

Наступного разу достатньо:

```powershell
npm run dev
```

Після додавання нових міграцій знову виконайте `npm run db:migrate`.

### Перевірка

```powershell
npm run typecheck
npm run test
npm run build
npm run openapi
```

API readiness: [http://localhost:4000/api/v1/health/ready](http://localhost:4000/api/v1/health/ready). Swagger: [http://localhost:4000/api/docs](http://localhost:4000/api/docs).

### Swagger і OpenAPI

Swagger UI формується з актуальних NestJS-контролерів і DTO та доступний за адресою `/api/docs`. Версійований API має префікс `/api/v1`.

Після будь-якої зміни route, query/body DTO або response DTO виконайте:

```powershell
npm run openapi
Set-Location ../frontend
npm run api:generate
```

Перша команда оновлює `backend/openapi.json`, друга — типізований frontend-контракт `frontend/src/api/generated/schema.d.ts`. Це згенеровані файли: не редагуйте їх вручну та зберігайте обидва в одній зміні.

## 2. Docker: production

Команди Docker виконуйте з кореня репозиторію, не з каталогу `backend`.

### Налаштування

```powershell
Copy-Item .env.docker.example .env.docker
```

У `.env.docker` задайте справжній production `DATABASE_URL`, JWT secrets, `FRONTEND_ORIGIN=https://...` і `COOKIE_SECURE=true`. Файл `backend/.env` у Docker-режимі не використовується.

Якщо SQL Server працює на Docker-хості, використовуйте `host.docker.internal`; для окремого DB-сервера використовуйте його приватне DNS-ім'я або IP. Не використовуйте `localhost` усередині контейнера.

### Запуск

```powershell
docker compose --env-file .env.docker up -d --build
```

Перед кожним стартом API його entrypoint автоматично виконує `npm run db:migrate`. Команда застосовує лише нові міграції; вже виконані пропускаються. NestJS запускається тільки після успішної міграції.

Без CI/CD оновлення виконується на production-сервері вручну (переконайтесь що в папці остання версія проекту):

```powershell
docker compose --env-file .env.docker up -d --build
```

Користувач БД із `DATABASE_URL` повинен мати права на зміну схеми. Перед потенційно руйнівними міграціями створюйте backup.

Перевірити результат можна в логах:

```powershell
docker compose --env-file .env.docker logs -f api
```

Автоматичні міграції підходять для одного API-контейнера. Якщо пізніше буде кілька API-реплік, міграції слід винести в окремий deployment job.

Системні дані створює migration. Якщо потрібний bootstrap-адміністратор, один раз виконайте `npm run db:seed` із довіреного dev-комп'ютера, тимчасово задавши production `DATABASE_URL` і `BOOTSTRAP_ADMIN_*`. Не зберігайте production credentials у `backend/.env`.

### Перевірка

```powershell
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f api
```

`PRISMA_GENERATE_DATABASE_URL` у Dockerfile — фіктивний build-only аргумент. Prisma потребує його для генерації клієнта, але не підключається за цією адресою. Справжній production URL надходить контейнерам тільки з `.env.docker`; передавати production credentials у `docker build` не потрібно і небезпечно.
