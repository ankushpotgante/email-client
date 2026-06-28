FROM node:20-alpine

WORKDIR /app

# Copy dependency configs and run clean install
COPY package.json package-lock.json ./
RUN npm ci

# Copy frontend source code and configs
COPY src/ ./src/
COPY public/ ./public/
COPY next.config.ts tsconfig.json postcss.config.mjs eslint.config.mjs vitest.config.ts ./

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=development
# Disable Turbopack inside container if needed, or let next run normally
ENV NEXT_TELEMETRY_DISABLED=1

CMD ["npm", "run", "dev"]
