FROM node:18-alpine

WORKDIR /app

RUN addgroup -g 1001 -S ferrymon && \
    adduser -S -u 1001 -G ferrymon ferrymon

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN chown -R ferrymon:ferrymon /app
USER ferrymon

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["node", "server.js"]
