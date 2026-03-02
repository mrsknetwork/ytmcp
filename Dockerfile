# Use a slim Node.js image
FROM node:20-bookworm-slim

WORKDIR /app

# Install runtime dependencies for yt-dlp (python3 and ffmpeg)
RUN apt-get update && apt-get install -y \
    python3 \
    python-is-python3 \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install the latest version of the MCP server globally or locally in /app
RUN npm install @mrsknetwork/ytmcp@latest

# Environment variables (To be provided at runtime)
# ENV GOOGLE_CLIENT_ID=""
# ENV GOOGLE_CLIENT_SECRET=""
ENV GOOGLE_REDIRECT_URI="http://localhost:3000/oauth2callback"
ENV NODE_ENV=production
ENV PORT=3000

# The server communicates via standard I/O (stdio)
ENTRYPOINT ["npx", "-y", "@mrsknetwork/ytmcp@latest"]
