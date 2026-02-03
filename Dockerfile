# ====================================================================================
# STAGE 1: BUILDER
# Use the full-featured Node.js image to avoid build tool conflicts.
# ====================================================================================
FROM node:20 AS builder
WORKDIR /app

# Ensure devDependencies (vite, typescript, etc.) are installed regardless of build args
ENV NODE_ENV=development

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build


# ====================================================================================
# STAGE 2: PRODUCTION
# Use the small Alpine image for the final, lean container.
# ====================================================================================
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache curl

COPY package*.json ./
# Install ONLY production dependencies.
RUN npm ci --omit=dev

# Copy the finished build from the builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/entrypoint.sh .
COPY --from=builder /app/server ./server
COPY --from=builder /app/app ./app
COPY --from=builder /app/tsconfig.json .

RUN chmod +x ./entrypoint.sh
RUN npx prisma generate

ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:3000/healthz || exit 1

ENTRYPOINT ["./entrypoint.sh"]
CMD ["npm", "run", "start"]