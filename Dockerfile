# Stage 1: Install all dependencies (including dev)
FROM node:20-alpine AS development-dependencies-env
COPY ./package.json package-lock.json /app/
WORKDIR /app
RUN npm ci

# Stage 2: Build the application and generate Prisma client
FROM node:20-alpine AS build-env
COPY . /app
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN npx prisma generate
RUN npm run build

# Stage 3: Build a lean production-only node_modules
FROM node:20-alpine AS production-dependencies-env
COPY ./package.json package-lock.json /app/
WORKDIR /app
RUN npm ci --omit=dev

# Stage 4: Final production image
FROM node:20-alpine
WORKDIR /app
# Copy the lean production node_modules
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
# Copy the built application code from the build stage
COPY --from=build-env /app/build ./build
# Copy the prisma schema/migrations from the build stage
COPY --from=build-env /app/prisma ./prisma
# **THE CRITICAL FIX:** Copy the generated Prisma client from the build stage
# into the production node_modules.
COPY --from=build-env /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build-env /app/node_modules/@prisma/client ./node_modules/@prisma/client

CMD ["sh", "-c", "npm run db:deploy && npm run start"]
#CMD [ "sleep", "infinity" ]