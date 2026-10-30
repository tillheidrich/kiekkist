FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4410 KK_DATA_DIR=/data PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY package*.json ./
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ curl \
 && npm ci --omit=dev && npx playwright install --with-deps chromium \
 && rm -rf /root/.cache /root/.npm /var/lib/apt/lists/*
COPY . .
RUN chmod +x docker-entrypoint.sh cli/kk.js \
 && useradd -r -u 10001 -m -d /home/kk kk && mkdir -p /data && chown kk:kk /data && chmod -R a+rX /ms-playwright
VOLUME ["/data"]
EXPOSE 4410
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s CMD node -e "fetch('http://127.0.0.1:4410/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["./docker-entrypoint.sh"]
