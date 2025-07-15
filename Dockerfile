# The correct "Build Locally" Dockerfile
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache curl

COPY package*.json ./
RUN npm ci --omit=dev

# This line will now work because 'build' is no longer ignored
COPY ./build ./build

COPY ./prisma ./prisma
COPY ./entrypoint.sh .

RUN chmod +x ./entrypoint.sh
RUN npx prisma generate

ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:3000/healthz || exit 1

ENTRYPOINT ["./entrypoint.sh"]
CMD ["npm", "run", "start"]