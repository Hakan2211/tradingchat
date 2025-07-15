
FROM node:20-alpine AS builder
ENV DATABASE_URL=file:./prisma/data/dev.db
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app


RUN apk add --no-cache curl


COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh


RUN chmod +x ./entrypoint.sh


RUN mkdir -p /app/prisma/data


ENV PORT=3000
EXPOSE 3000


HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:3000/ || exit 1


ENTRYPOINT ["./entrypoint.sh"]
CMD ["npm", "run", "start"]