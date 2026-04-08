# Use Node.js 20 for better-sqlite3 compatibility (produces NODE_MODULE_VERSION 127)
FROM node:20

# Install dependencies for SQLite and build tools (Debian)
RUN apt-get update && apt-get install -y sqlite3 libsqlite3-dev python3 make g++ curl && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Build frontend assets for production
ARG GIGLEDGER_BASE_PATH=
ENV GIGLEDGER_BASE_PATH=${GIGLEDGER_BASE_PATH}
RUN npm run build

# Create directory for SQLite database
RUN mkdir -p /app/data

# Set runtime environment variables
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/ledger.db

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const normalize=(raw)=>{const v=(raw||'').trim();if(v===''||v==='/')return '';const s=v.startsWith('/')?v:'/'+v;return s.replace(/\\/$/,'');};const bp=normalize(process.env.GIGLEDGER_BASE_PATH);fetch('http://localhost:3000'+bp+'/api/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

# Start the application
CMD ["npm", "start"]
