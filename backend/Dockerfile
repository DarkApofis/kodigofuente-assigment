# ---- Builder ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runner ----
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ARG PORT=3000
ENV PORT=$PORT

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --chmod=755 docker-entrypoint.sh ./

USER node
EXPOSE $PORT

CMD ["./docker-entrypoint.sh"]
