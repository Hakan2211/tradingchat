# Stage 1: Build the application
# This stage installs ALL dependencies (including dev), generates the client,
# and builds your TypeScript code.
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
# Copy the package.json file needed for the start scripts
COPY package*.json ./

# Copy ALL necessary artifacts from the 'builder' stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/prisma ./prisma

# This command will now work because all files are in the right place.
CMD ["sh", "-c", "npm run db:deploy && npm run start"]