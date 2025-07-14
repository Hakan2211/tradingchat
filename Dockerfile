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
# Copy our new entrypoint script
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh

# The default command that will be executed by our entrypoint script
CMD ["npm", "run", "start"]

# Tells the container to use our script as the main entrypoint
ENTRYPOINT ["./entrypoint.sh"]