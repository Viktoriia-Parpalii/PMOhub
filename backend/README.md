# PMO Hub backend

NestJS REST API with Prisma and Microsoft SQL Server 2022.

## Локальний запуск API та frontend

Потрібні Node.js 20+, npm і Docker Desktop. Команди нижче виконуються в PowerShell.

### 1. Запустіть SQL Server і підготуйте API

У корені репозиторію:

```powershell
docker compose up -d sqlserver
docker compose exec sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "ChangeMe_Strong_123" -C -Q "IF DB_ID(N'pmohub') IS NULL CREATE DATABASE pmohub"
```

Скопіюйте `backend/.env.example` у `backend/.env`. Для локальної розробки залиште:

```dotenv
PORT=4000
FRONTEND_ORIGIN=http://localhost:3000
COOKIE_SECURE=false
HTTP_BODY_LIMIT=10mb
EXPOSE_ERROR_DETAILS=true
```

Задайте у цьому ж файлі унікальні значення довжиною щонайменше 32 символи для `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` і `MERGE_TOKEN_SECRET`. За потреби задайте `BOOTSTRAP_ADMIN_*`, щоб створити першого адміністратора під час seed.

Далі, у новому терміналі:

```powershell
Set-Location backend
npm ci
npm run prisma:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Перевірте готовність API: [http://localhost:4000/api/v1/health/ready](http://localhost:4000/api/v1/health/ready). Swagger доступний за [http://localhost:4000/api/docs](http://localhost:4000/api/docs).

### 2. Запустіть frontend з підключенням до API

У ще одному терміналі:

```powershell
Set-Location frontend
Copy-Item .env.example .env
npm ci
npm run dev
```

У `frontend/.env` повинні бути такі значення:

```dotenv
VITE_API_URL=http://localhost:4000/api/v1
```

Відкрийте [http://localhost:3000](http://localhost:3000). Frontend завжди відновлює сесію через refresh-cookie та отримує дані з API/MSSQL; автономного demo-mode немає. Залишайте API і frontend на `localhost` — не змішуйте `localhost` з `127.0.0.1`, інакше cookie-сесія/CORS матимуть інший origin.

Після зміни `VITE_*` змінних перезапустіть `npm run dev`. Якщо змінюєте порт або домен frontend, одночасно змініть `FRONTEND_ORIGIN` у `backend/.env` на точний origin (наприклад, `http://localhost:5173`) і перезапустіть API.

`HTTP_BODY_LIMIT` обмежує розмір JSON-запитів, зокрема backup import; `10mb` достатньо для звичайного портфеля. `EXPOSE_ERROR_DETAILS=true` додає технічний текст і stack trace лише у JSON-відповідь для Network tab — frontend показує користувачу тільки локалізоване повідомлення. У production встановіть `EXPOSE_ERROR_DETAILS=false`.

### Docker-запуск API

`docker compose up -d` також запускає контейнер API. Для нього `DATABASE_URL` примусово вказує на docker-host `sqlserver`, а не на `localhost`. Перед першим запуском все одно створіть базу та застосуйте migrations; найпростіше виконати команди `db:migrate` і `db:seed` з локального каталогу `backend`, як показано вище.

The seed always creates the three role-permission rows. It creates the first `SUPER_ADMIN` only when all `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME`, and `BOOTSTRAP_ADMIN_PASSWORD` variables are present. Re-running it never replaces an existing password.

## Відновлення доступу адміністратора

Користувач змінює пароль лише після входу в систему. Якщо пароль забуто, `ADMIN` або `SUPER_ADMIN` у розділі **Адміністрування → Користувачі системи** видає тимчасовий пароль. Він показується тільки один раз; після входу користувач має змінити його у профілі. `ADMIN` не може скидати пароль `SUPER_ADMIN`.

Якщо втрачено пароль єдиного `SUPER_ADMIN`, розробник із доступом до коду й БД може офлайн згенерувати Argon2id-хеш:

```powershell
$env:RECOVERY_EMAIL = 'admin@example.com'
$env:RECOVERY_PASSWORD = 'a-new-strong-password-at-least-12-chars'
npm run password:hash
```

Скрипт надрукує готовий SQL `UPDATE` для таблиці `users`. Виконайте його лише після перевірки email, а новий пароль передайте власнику захищеним каналом. Для безпеки скрипт не підключається до БД і не змінює дані самостійно.

Never commit plaintext passwords, JWTs, refresh tokens, or generated password hashes.

## Verification

```powershell
npm run typecheck
npm run test
npm run build
```

All database timestamps are UTC; archive rules use `BUSINESS_TIME_ZONE` (default `Europe/Kyiv`).
