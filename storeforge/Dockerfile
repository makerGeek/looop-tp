# syntax=docker/dockerfile:1

# Build and run are separate stages so the runtime image carries neither the
# toolchain nor dev dependencies.
FROM node:22-slim AS build
WORKDIR /app

# Dependencies are their own layer, so a source-only change does not reinstall.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build


FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Migrations run as a release step, so the image needs the runner, the
# migration files and drizzle — but nothing else from the build stage.
COPY --from=build /app/.output ./.output
COPY --from=build /app/server/db/migrations ./server/db/migrations
COPY --from=build /app/scripts/migrate.ts ./scripts/migrate.ts
COPY --from=build /app/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund drizzle-orm postgres tsx

# Never run as root.
USER node

EXPOSE 3000
ENV PORT=3000 HOST=0.0.0.0

# The platform's health check uses /api/health, which touches Postgres; this is
# the in-container fallback for plain `docker run`.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
