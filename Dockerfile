# ===================================================
# Stage 1: Build TypeScript source
# ===================================================
FROM node:20-alpine AS base

RUN apk add --no-cache postgresql-client

FROM base AS builder

WORKDIR /usr/src/app

# Copy dependency definitions and TypeScript configuration
COPY package*.json tsconfig.json .npmrc ./
RUN npm install

# Copy project files and compile to JavaScript
COPY . .
RUN npm run build

# ===================================================
# Stage 2: Production runtime environment
# ===================================================
FROM base AS runner

WORKDIR /usr/src/app

# Copy package manifests and install only production dependencies
COPY package*.json .npmrc ./
RUN npm install --omit=dev

# Copy compiled files from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Ensure uploads directory exists
RUN mkdir -p uploads

# Expose backend listening port
EXPOSE 3000

ENV NODE_ENV=production

# Start the compiled application
CMD ["node", "dist/server.js"]
