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
COPY package*.json ./

# Copy ALL necessary artifacts from the 'builder' stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh

# **THE GUARANTEED FIX:**
# This command runs INSIDE the container and makes the script executable.
# This bypasses all Git for Windows permission issues.
RUN chmod +x ./entrypoint.sh

# This tells the container to use our script as the main entrypoint
ENTRYPOINT ["./entrypoint.sh"]

# The default command that will be executed by our entrypoint script
CMD ["npm", "run", "start"]