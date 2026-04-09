# GrafanaProbe v2 — Multi-stage Docker build
# by Gopal Rao

# Stage 1: Build frontend
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Production backend
FROM node:20-slim AS production
WORKDIR /app
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --production
COPY backend/ ./
COPY --from=frontend-build /app/frontend/build /app/frontend/build
RUN mkdir -p data reports screenshots

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["node", "src/server.js"]
