# Agent 3: Jake Voice & Character System
FROM node:20-alpine

WORKDIR /app

# Copy root package files (jake service uses root package.json)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy jake service code
COPY services/jake/ ./services/jake/
COPY types/ ./types/
COPY tsconfig.json ./

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3002/api/v1/health || exit 1

CMD ["node", "--loader", "tsx", "services/jake/server.ts"]
