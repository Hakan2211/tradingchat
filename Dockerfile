# Stage 1: Build the application
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Create the final, clean production image
FROM node:20-alpine
WORKDIR /app

# **STEP A:** Install curl, which the HEALTHCHECK instruction will use.
RUN apk add --no-cache curl

# **STEP B:** Copy all necessary code and artifacts.
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh

# **STEP C:** Make the entrypoint script executable.
RUN chmod +x ./entrypoint.sh

# **STEP D:** Define the Docker-native Health Check.
# This tells Docker to run "curl" on our /healthz endpoint every 30 seconds.
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

# **STEP E:** Set the entrypoint and default command for the application.
ENTRYPOINT ["./entrypoint.sh"]
CMD ["npm", "run", "start"]