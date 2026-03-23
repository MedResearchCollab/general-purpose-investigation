# Use Node 18 LTS
FROM node:18-slim AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* .npmrc* ./

# Install dependencies - use npm's cache dir to avoid EBUSY with node_modules/.cache
RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
    npm install --legacy-peer-deps --prefer-offline

# Copy source and build
COPY . .
RUN npm run build

# Production image - serve static files
FROM node:18-slim

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/build ./build

EXPOSE 3000

CMD ["sh", "-c", "serve -s build -l ${PORT:-3000}"]
