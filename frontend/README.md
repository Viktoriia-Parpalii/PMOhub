# PMO Hub frontend

Frontend — це React/Vite застосунок. Він завжди працює через backend API. Повна інструкція для всього застосунку є у [кореневому README](../README.md).

## 1. Локально: розробка і тестування

Спочатку запустіть backend на `http://localhost:4000`. Потім відкрийте PowerShell у каталозі `frontend`.

### Налаштування

```powershell
Copy-Item .env.example .env
```

Перевірте `frontend/.env`:

```dotenv
VITE_API_URL=http://localhost:4000/api/v1
VITE_BASE_PATH=/
```

У `backend/.env` значення `FRONTEND_ORIGIN` має дорівнювати `http://localhost:3000`.

### Запуск

```powershell
npm ci
npm run dev
```

Відкрийте [http://localhost:3000](http://localhost:3000). Не змішуйте `localhost` і `127.0.0.1`, оскільки для cookies і CORS це різні адреси.

### Перевірка

```powershell
npm run typecheck
npm run test
npm run build
```

## 2. Docker: production

Окремо запускати Dockerfile frontend не потрібно. Використовуйте кореневий `docker-compose.yml`, який запускає frontend і backend разом у різних контейнерах.

### Налаштування

Команди виконуйте з кореня репозиторію:

```powershell
Copy-Item .env.docker.example .env.docker
```

Для frontend залиште в `.env.docker`:

```dotenv
VITE_API_URL=/api/v1
VITE_BASE_PATH=/
FRONTEND_PORT=3000
```

`VITE_*` значення вбудовуються під час збирання image. Після їх зміни frontend потрібно перебудувати.

### Запуск

```powershell
docker compose --env-file .env.docker up -d --build
```

Dockerfile збирає Vite-застосунок, а Nginx віддає готові файли та перенаправляє `/api/*` до `api:4000` у внутрішній Docker-мережі.

Для первинної перевірки відкрийте `http://SERVER_ADDRESS:3000`. У production налаштуйте HTTPS reverse proxy або load balancer і відкривайте сайт через публічний домен, наприклад `https://pmohub.example.com`.

### Перевірка

```powershell
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f frontend
```
