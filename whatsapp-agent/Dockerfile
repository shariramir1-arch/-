FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY tsconfig.json ./
COPY src ./src
# Tasks, leads, notes and reminders are kept here - mount a volume to keep them across deploys
ENV DATA_FILE=/data/db.json
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:${PORT:-3000}/health || exit 1
CMD ["node", "--import", "tsx", "src/server.ts"]
