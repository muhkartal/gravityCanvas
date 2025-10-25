FROM node:18-alpine AS base

WORKDIR /app

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS builder

WORKDIR /app

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine AS production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S gravity -u 1001

WORKDIR /app

RUN apk add --no-cache dumb-init && rm -rf /var/cache/apk/*

COPY --from=base --chown=gravity:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=gravity:nodejs /app/dist ./dist
COPY --chown=gravity:nodejs package*.json ./

USER gravity

EXPOSE 3001

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
