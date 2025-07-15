
FROM node:20-alpine AS builder
#ENV DATABASE_URL=file:./prisma/data/dev.db
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache curl

COPY package*.json ./

# Install ONLY production dependencies. Skips Vite, tsx, etc.
# This creates a lean and clean node_modules folder for production.
RUN npm ci --omit=dev

COPY --from=builder /app/build ./build
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/entrypoint.sh .

RUN chmod +x ./entrypoint.sh

# Generate the Prisma client based on the schema
# This needs to be run after production dependencies are installed
RUN npx prisma generate

ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:3000/healthz || exit 1

ENTRYPOINT ["./entrypoint.sh"]
CMD ["npm", "run", "start"]