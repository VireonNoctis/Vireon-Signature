FROM node:24-bookworm-slim AS frontend-build
WORKDIR /workspace
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM debian:bookworm-slim AS backend-build
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake librocksdb-dev libboost-system-dev libssl-dev nlohmann-json3-dev \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /workspace
COPY backend ./backend
RUN cmake -S backend -B backend/build -DCMAKE_BUILD_TYPE=Release \
    && cmake --build backend/build --parallel 2

FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    librocksdb-dev libboost-system-dev libssl-dev ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=frontend-build /workspace/dist ./web
COPY --from=backend-build /workspace/backend/build/signature-api ./signature-api
RUN mkdir -p /data && chown -R 10001:10001 /app /data
ENV PORT=8080 \
    DATA_DIR=/data \
    WEB_ROOT=/app/web \
    COOKIE_SECURE=true
EXPOSE 8080
VOLUME ["/data"]
USER 10001:10001
ENTRYPOINT ["/app/signature-api"]
