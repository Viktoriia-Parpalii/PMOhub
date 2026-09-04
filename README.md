# PMO Hub

PMO Hub складається з трьох частин:

- `frontend` — React/Vite;
- `backend` — NestJS/Prisma API;
- Microsoft SQL Server — зовнішня база даних, яка не запускається цим проєктом.

Нижче є два незалежні способи запуску. Для щоденної розробки використовуйте локальний запуск. Для production використовуйте Docker.

## 1. Локально: розробка і тестування

### Що потрібно

- Node.js 22 і npm;
- запущений SQL Server, доступний з вашого комп'ютера;
- порожня або вже створена база даних `pmohub`.

Prisma створює таблиці всередині готової бази, але не встановлює SQL Server і не створює саму базу `pmohub`.

### Крок 1. Налаштуйте backend

Відкрийте PowerShell у корені репозиторію:

```powershell
Set-Location backend
Copy-Item .env.example .env
```

Відкрийте `backend/.env` і замініть тестові значення:

```dotenv
DATABASE_URL="sqlserver://localhost:1433;database=pmohub;schema=dbo;user=pmohub_app;password=YOUR_PASSWORD;encrypt=true;trustServerCertificate=true"
JWT_ACCESS_SECRET=випадковий-секрет-щонайменше-32-символи
JWT_REFRESH_SECRET=інший-випадковий-секрет-щонайменше-32-символи
FRONTEND_ORIGIN=http://localhost:3000
COOKIE_SECURE=false
```

Якщо SQL Server розташований на іншому комп'ютері, замініть `localhost` його DNS-іменем або IP-адресою. Користувач БД повинен мати право створювати й змінювати таблиці для виконання міграцій.

Встановіть залежності та підготуйте базу:

```powershell
npm ci
npm run db:migrate
npm run dev
```

Що роблять команди:

- `npm ci` встановлює залежності та генерує Prisma Client;
- `db:migrate` застосовує структуру таблиць і створює системні ролі, початкові права, DEFAULT-статус та DEFAULT-вагу;
- `db:seed` потрібний лише опційно для створення першого адміністратора через `BOOTSTRAP_ADMIN_*`;
- `npm run dev` запускає API з автоматичним перезапуском після змін.

Окремий seed для системних даних більше не потрібний. Якщо потрібно створити першого адміністратора, заповніть у `backend/.env` усі три значення `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME` і `BOOTSTRAP_ADMIN_PASSWORD` та один раз виконайте `npm run db:seed`.

RBAC нормалізовано через `roles`: `users.role` і `role_permissions.role` є зовнішніми ключами на `roles.code`. Початкова роль для нових користувачів позначається `roles.is_default`, тому frontend не залежить від захардкодженого переліку ролей.

Не закривайте цей термінал. API працюватиме на `http://localhost:4000`.

### Крок 2. Запустіть frontend

Відкрийте другий PowerShell у корені репозиторію:

```powershell
Set-Location frontend
Copy-Item .env.example .env
```

Перевірте `frontend/.env`:

```dotenv
VITE_API_URL=http://localhost:4000/api/v1
VITE_BASE_PATH=/
```

Потім виконайте:

```powershell
npm ci
npm run dev
```

Відкрийте сайт: [http://localhost:3000](http://localhost:3000).

Корисні адреси:

- готовність API: [http://localhost:4000/api/v1/health/ready](http://localhost:4000/api/v1/health/ready);
- Swagger: [http://localhost:4000/api/docs](http://localhost:4000/api/docs).

Не змішуйте `localhost` і `127.0.0.1`: для cookies і CORS це різні адреси.

### Крок 3. Запустіть перевірки

Backend:

```powershell
Set-Location backend
npm run typecheck
npm run test
npm run build
```

Frontend:

```powershell
Set-Location frontend
npm run typecheck
npm run test
npm run build
```

## 2. Docker: production

У цьому режимі Docker Compose запускає:

- `frontend` — статичну production-збірку у Nginx;
- `api` — production-збірку NestJS, яка перед кожним стартом автоматично застосовує ще не виконані міграції.

SQL Server у Docker не запускається. Дані, резервні копії та доступність БД обслуговуються на зовнішньому SQL Server.

### Крок 1. Підготуйте сервер і базу

На production-сервері мають бути встановлені Docker Engine і Docker Compose. SQL Server повинен бути доступний із Docker-хоста через приватну мережу, а база `pmohub` — уже створена.

Не відкривайте SQL Server порт `1433` для всього інтернету. Дозвольте доступ лише з application-сервера або приватної мережі.

### Крок 2. Створіть production-конфігурацію

У корені репозиторію виконайте:

```powershell
Copy-Item .env.docker.example .env.docker
```

Заповніть `.env.docker`. Це єдиний env-файл для Docker-запуску; `backend/.env` і `frontend/.env` у цьому режимі не використовуються.

Обов'язково змініть:

```dotenv
DATABASE_URL="sqlserver://sql01.internal.company:1433;database=pmohub;schema=dbo;user=pmohub_app;password=YOUR_PASSWORD;encrypt=true;trustServerCertificate=true"
JWT_ACCESS_SECRET=довгий-випадковий-production-секрет
JWT_REFRESH_SECRET=інший-довгий-випадковий-production-секрет
FRONTEND_ORIGIN=https://pmohub.example.com
COOKIE_SECURE=true
```

Якщо SQL Server встановлений безпосередньо на тому самому сервері, де працює Docker, замість його імені можна використати `host.docker.internal`. Усередині контейнера не використовуйте `localhost`: там це адреса самого контейнера.

Залиште frontend-параметри такими:

```dotenv
VITE_API_URL=/api/v1
VITE_BASE_PATH=/
```

Відносна адреса `/api/v1` потрібна, щоб Nginx frontend-контейнера перенаправляв API-запити до `api:4000` у внутрішній Docker-мережі.

`.env.docker` містить секрети й не повинен потрапляти в Git. У зрілому production-середовищі ці значення краще подавати із secret manager.

### Крок 3. Зберіть і запустіть контейнери

У корені репозиторію виконайте:

```powershell
docker compose --env-file .env.docker up -d --build
docker compose --env-file .env.docker ps
```

Поки CI/CD не використовується, кожне оновлення виконуйте на production-сервері вручну (переконайтесь що в папці остання версія проекту):

```powershell
docker compose --env-file .env.docker up -d --build
docker compose --env-file .env.docker logs -f api
```

Якщо оновлення містить нові файли в `backend/prisma/migrations`, API image буде перебудований, контейнер створиться повторно й автоматично застосує ці міграції.

Послідовність автоматична:

1. збираються Docker images;
2. контейнер `api` отримує справжній `DATABASE_URL` із `.env.docker`;
3. API виконує `prisma migrate deploy`, який застосовує лише нові міграції;
4. після успішної міграції запускається NestJS;
5. після успішного health check API запускається `frontend`.

Якщо міграція не виконалася, NestJS не стартує. Причину дивіться в логах API:

```powershell
docker compose --env-file .env.docker logs api
```

`prisma migrate deploy` можна безпечно запускати повторно: вже застосовані міграції він пропускає. У цій конфігурації команда виконується при кожному старті або повторному створенні API-контейнера. Цей підхід розрахований на один екземпляр API. Якщо в майбутньому з'явиться кілька реплік, міграції потрібно буде винести в окремий deployment job.

Користувач із `DATABASE_URL` повинен мати права на зміну схеми БД. Перед міграціями, які видаляють або перетворюють дані, обов'язково створюйте backup SQL Server.

### Крок 4. За потреби створіть першого production-адміністратора

Системні ролі, права й обов'язкові DEFAULT-довідники створює initial migration. Команда seed потрібна лише для опційного bootstrap-адміністратора і не змінює системні довідники.

У каталозі `backend` задайте production-підключення лише для поточного PowerShell-процесу:

```powershell
$env:DATABASE_URL = "PRODUCTION_DATABASE_URL"
$env:BOOTSTRAP_ADMIN_EMAIL = "admin@example.com"
$env:BOOTSTRAP_ADMIN_NAME = "System Administrator"
$env:BOOTSTRAP_ADMIN_PASSWORD = "YOUR_INITIAL_PASSWORD"
npm run db:seed

Remove-Item Env:DATABASE_URL
Remove-Item Env:BOOTSTRAP_ADMIN_EMAIL
Remove-Item Env:BOOTSTRAP_ADMIN_NAME
Remove-Item Env:BOOTSTRAP_ADMIN_PASSWORD
```

Не записуйте production-паролі в `backend/.env` і не додавайте їх у Git. Bootstrap seed потрібний лише один раз, якщо адміністратора не створено іншим контрольованим способом.

### Крок 5. Перевірте deployment

Для первинної перевірки без зовнішнього reverse proxy сайт доступний на:

```text
http://SERVER_ADDRESS:3000
```

У production перед frontend-контейнером повинен бути TLS reverse proxy або load balancer, який публікує сайт як `https://pmohub.example.com`.

Перевірка стану й логів:

```powershell
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f api frontend
```

Зупинка застосунку:

```powershell
docker compose --env-file .env.docker down
```

Ця команда не видаляє дані, тому що SQL Server працює поза Docker.

### Чому в Dockerfile є build-time DATABASE_URL

Під час `npm ci` автоматично виконується `prisma generate`. Prisma вимагає синтаксично правильний `DATABASE_URL`, але під час генерації не підключається до бази.

Тому в `backend/Dockerfile` є один аргумент `PRISMA_GENERATE_DATABASE_URL` із фіктивною адресою. Це не test і не production база. Він потрібний лише для генерації коду та не потрапляє в runtime environment API.

Справжній production `DATABASE_URL` не можна передавати під час `docker build`: секрет може залишитися в історії або кеші образу. Реальна адреса надходить лише під час запуску `api` із `.env.docker` і використовується спочатку для міграцій, а потім для роботи застосунку.
