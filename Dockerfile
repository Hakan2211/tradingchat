# Stage 1: Build the application
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Create the final, clean production image
FROM node:20-alpine
WORKDIR /app

# Install curl for the health check
RUN apk add --no-cache curl

# Copy only production-necessary files from the builder stage
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh

# Make the entrypoint script executable
RUN chmod +x ./entrypoint.sh

# Create the prisma data directory
RUN mkdir -p /app/prisma/data

# Set the port your application will run on
ENV PORT=3000
EXPOSE 3000

# Docker-native Health Check - increased timeout and retries
HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:3000/ || exit 1

# Set the entrypoint and default command
ENTRYPOINT ["./entrypoint.sh"]
CMD ["npm", "run", "start"]