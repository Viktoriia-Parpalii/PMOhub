# PMO Hub architecture and operations

PMO Hub uses a server-first architecture: NestJS and MSSQL are the source of truth, while React reads and invalidates server state through TanStack Query. Wire payloads use `snake_case`; mapping into UI models belongs to the frontend API layer.

## Local development

1. Start MSSQL with `docker compose up -d`.
2. Configure backend `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `MERGE_TOKEN_SECRET`, `FRONTEND_ORIGINS`, `COOKIE_SECURE` and `COOKIE_SAME_SITE`.
3. Run `npm ci`, `npm run db:migrate`, `npm run db:seed`, and `npm run dev` in `backend`.
4. Configure frontend `VITE_API_URL` and optional `VITE_BASE_PATH`; run `npm ci` and `npm run dev` in `frontend`.

Production frontend builds reject a missing or localhost `VITE_API_URL`. Cross-site deployments require `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=none`, and an exact frontend origin allowlist.

## Recovery and access control

- Backup export and validation require administrative access.
- Import requires `SUPER_ADMIN`, a short-lived validation token bound to the payload and import mode, and a transaction.
- Replace preserves the initiating SUPER_ADMIN and the immutable audit trail, while revoking other sessions.
- `isReadOnly` overrides every mutation permission.
- Aggregate mutations carry revisions and return `REVISION_CONFLICT` on stale writes.

## Verification

Frontend and backend expose `typecheck`, `test`, and `build` scripts. OpenAPI output and the generated frontend schema are committed and checked in CI. Backend CI starts MSSQL, deploys migrations, and runs a real rollback test.
