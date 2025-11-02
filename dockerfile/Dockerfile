# Multi-stage Dockerfile for Server Deployment
# This Dockerfile is optimized for deploying the server application from the server folder
# Build context should be set to the server directory

# Base stage - Node.js 20 Alpine for smaller image size
FROM node:20-alpine AS base

# Install necessary build tools and dependencies for Prisma
RUN apk add --no-cache libc6-compat openssl python3 make g++

# Dependencies stage - Install only production dependencies
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Builder stage - Build the TypeScript application
FROM base AS builder
WORKDIR /app

# Copy package files for builder
COPY package.json package-lock.json* ./
COPY tsconfig.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY src ./src

# Build TypeScript to JavaScript
RUN npm run build

# Production stage - Final runtime image
FROM base AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy package files
COPY package.json package-lock.json* ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Generate Prisma client in production image
COPY prisma ./prisma/
RUN npx prisma generate

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Create necessary directories
RUN mkdir -p /app/uploads && \
    chown -R nodejs:nodejs /app/uploads

# Set environment to production
ENV NODE_ENV=production

# Switch to non-root user
USER nodejs

# Expose port (can be overridden via PORT environment variable)
EXPOSE 3001

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/index.js"]
