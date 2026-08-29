FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .

# Run as the non-root node user created by the base image.
USER node

EXPOSE 9000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 CMD node healthcheck.js
CMD ["node", "index.js"]