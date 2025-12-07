# Multi-stage build for production
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS builder
WORKDIR /app

# Copy source code
COPY . .

# Install all dependencies (including dev dependencies)
RUN npm ci

# Build the application
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/server/dist ./server/dist
COPY --from=builder --chown=nextjs:nodejs /app/client/dist ./client/dist
COPY --from=builder --chown=nextjs:nodejs /app/server/node_modules ./server/node_modules
COPY --from=builder --chown=nextjs:nodejs /app/server/package*.json ./server/
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./

# Create uploads directory
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]
