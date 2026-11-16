FROM node:22-alpine AS deps
WORKDIR /app
COPY src/frontend/package.json src/frontend/package-lock.json ./
RUN npm ci

# Lint, type check and tests. Building this target is the quality gate.
FROM deps AS check
ENV NEXT_TELEMETRY_DISABLED=1
COPY src/frontend/ .
COPY tests/frontend/ tests/
RUN npm run lint && npm run typecheck && npm test

FROM deps AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY src/frontend/ .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
# BACKEND_URL is read on every request, so it can be overridden when the container starts.
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 BACKEND_URL=http://backend:8000
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 3000
CMD ["node", "server.js"]
