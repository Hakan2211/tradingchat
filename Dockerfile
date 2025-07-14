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
# **THE GUARANTEED FIX:** Install the 'curl' tool needed for Coolify's health check.
# 'apk' is the package manager for Alpine Linux.
RUN apk add --no-cache curl

COPY package*.json ./

# Copy ALL necessary artifacts from the 'builder' stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh

# Fix permissions for the entrypoint script
RUN chmod +x ./entrypoint.sh

# Tells the container to use our script as the main entrypoint
ENTRYPOINT ["./entrypoint.sh"]

# The default command that will be executed by our entrypoint script
CMD ["npm", "run", "start"]