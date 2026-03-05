FROM node:18-slim
WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY dist/ ./dist/

# Pass secrets via environment variables at runtime:
#   docker run --env-file .env personize-sync
# Do NOT bake .env into the image.
CMD ["node", "dist/sync.js"]
