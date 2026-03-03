FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    python3 \
    python-is-python3 \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./

RUN npm ci

COPY . .

RUN npm run build

RUN npm prune --production

ENV GOOGLE_REDIRECT_URI="http://localhost:3000/oauth2callback"
ENV NODE_ENV=production
ENV PORT=3000

ENTRYPOINT ["node", "build/server/index.js"]
