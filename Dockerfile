FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine AS production

RUN addgroup -g 1001 -S gravity
RUN adduser -S gravity -u 1001

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

RUN chown -R gravity:gravity /usr/share/nginx/html
RUN chown -R gravity:gravity /var/cache/nginx
RUN chown -R gravity:gravity /var/log/nginx
RUN chown -R gravity:gravity /etc/nginx/conf.d
RUN touch /var/run/nginx.pid
RUN chown -R gravity:gravity /var/run/nginx.pid

USER gravity

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
