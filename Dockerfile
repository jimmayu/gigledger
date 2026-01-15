# Use Node.js 20 for better-sqlite3 compatibility (produces NODE_MODULE_VERSION 127)
FROM node:20

# Install dependencies for SQLite and build tools (Debian)
RUN apt-get update && apt-get install -y sqlite3 libsqlite3-dev python3 make g++ curl && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application source
COPY . .

# Force complete rebuild of better-sqlite3 from source
RUN rm -rf node_modules/better-sqlite3 && npm install better-sqlite3 --build-from-source

# Create directory for SQLite database
RUN mkdir -p /app/data

# Set database path environment variable
ENV DATABASE_PATH=/app/data/ledger.db

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1))"

# Start the application
CMD ["npm", "start"]
