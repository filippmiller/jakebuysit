# Agent 4: Backend API (Fastify + TypeScript)
FROM node:20-alpine AS builder

WORKDIR /app

ENV NODE_ENV=development

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm install

ENV NODE_ENV=production

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -s /bin/sh -D appuser

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY src/db/schema.sql ./dist/db/schema.sql

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/health || exit 1

CMD ["node", "dist/index.js"]
