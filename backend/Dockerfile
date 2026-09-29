FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends poppler-utils curl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install --global npm@11.13.0 && npm ci --omit=dev
COPY . .
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node
ENV NODE_ENV=production
EXPOSE 5001
HEALTHCHECK --interval=15s --timeout=3s --retries=3 CMD curl -fsS http://127.0.0.1:5001/api/health/live || exit 1
CMD ["node", "server.js"]
