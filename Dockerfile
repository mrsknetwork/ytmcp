# --- Build Stage ---
FROM node:20-bookworm AS builder

# Set build-time working directory
WORKDIR /app

# Copy package metadata first for better caching
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for TypeScript compilation)
RUN npm install

# Copy source code and configuration
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript to JavaScript
RUN npm run build

# --- Runtime Stage ---
FROM node:20-bookworm-slim AS runtime

# Set runtime working directory
WORKDIR /app

# Install system dependencies for yt-dlp (python3 and ffmpeg)
# We use bookworm-slim for a smaller production image
RUN apt-get update && apt-get install -y \
    python3 \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package metadata and install only production dependencies
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy the compiled build from the builder stage
COPY --from=builder /app/build ./build

# Environment variables (To be provided at runtime)
# ENV GOOGLE_CLIENT_ID=""
# ENV GOOGLE_CLIENT_SECRET=""
ENV GOOGLE_REDIRECT_URI="http://localhost:3000/oauth2callback"
ENV NODE_ENV=production
ENV PORT=3000

# The server communicates via standard I/O (stdio)
ENTRYPOINT ["node", "build/server/index.js"]
