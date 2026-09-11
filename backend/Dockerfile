FROM node:22-alpine AS dependencies
WORKDIR /app

# Prisma reads DATABASE_URL while generating the client, but does not connect to
# the database. This build-only placeholder is not used by the running API.
ARG PRISMA_GENERATE_DATABASE_URL="sqlserver://localhost:1433;database=build;schema=dbo;user=build;password=BuildOnly_123;encrypt=true;trustServerCertificate=true"

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
RUN DATABASE_URL="$PRISMA_GENERATE_DATABASE_URL" npm ci

FROM dependencies AS build
COPY . .
RUN npm run build

# Reuse already installed modules and remove development-only packages without
# rerunning postinstall or Prisma generation.
FROM build AS production-dependencies
RUN npm prune --omit=dev --ignore-scripts

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --chmod=755 docker-entrypoint.sh ./docker-entrypoint.sh
EXPOSE 4000
USER node
ENTRYPOINT ["./docker-entrypoint.sh"]
