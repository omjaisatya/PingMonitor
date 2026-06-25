FROM node:20-alpine

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN apk update && apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 3006

ENV NODE_ENV=production
CMD ["node", "server.js"]
