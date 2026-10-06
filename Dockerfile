# STUDLYF — one image holding both halves of the site.
#
# The deployment is a single Node service: this process serves the built frontend from
# CLIENT_DIR, with a SPA fallback for client-side routes, and the API under /api/v1 and the
# uploaded media under /media. One origin means the session cookie is first-party, so
# SameSite=Lax is enough and no CORS rule is involved.
#
#   docker build -t studlyf .
#   docker run -p 4000:4000 \
#     -e NODE_ENV=production \
#     -e MONGODB_URI='mongodb+srv://…' \
#     -e APP_URL='https://studlyf.com' \
#     -e API_PUBLIC_URL='https://studlyf.com' \
#     -e CORS_ORIGINS='https://studlyf.com' \
#     -e TRUST_PROXY=1 \
#     -e MAIL_DRIVER=smtp -e SMTP_URL='smtps://…' \
#     -v studlyf-uploads:/app/server/uploads \
#     studlyf
#
# The five production-required variables are not optional: the server validates them at boot
# and exits with a specific message rather than starting up in a state that silently loses
# password-reset mail or mislabels every rate-limited client.

# ---- stage 1: build the frontend -------------------------------------------------------
FROM node:20-alpine AS client
WORKDIR /build
# Lockfile first, so the (slow) install layer is cached until dependencies actually change.
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js postcss.config.js tailwind.config.js ./
COPY src ./src
COPY public ./public
RUN npm run build

# ---- stage 2: runtime ------------------------------------------------------------------
FROM node:20-alpine
WORKDIR /app/server
ENV NODE_ENV=production

# Production dependencies only — vitest, supertest and the embedded mongod (a devDependency
# that pulls a ~100 MB binary) never reach the image.
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server/src ./src
# Matches CLIENT_DIR's default of ../dist, resolved from this WORKDIR.
COPY --from=client /build/dist /app/dist

# Uploaded media is written here at runtime. Declared as a volume so it survives a redeploy;
# without it every upload is lost when the container is replaced.
RUN mkdir -p /app/server/uploads /app/server/uploads-private \
  && chown -R node:node /app/server/uploads /app/server/uploads-private /app/dist
VOLUME ["/app/server/uploads", "/app/server/uploads-private"]

# The node image ships an unprivileged `node` user; there is no reason to serve as root.
USER node

EXPOSE 4000

# /ready is a real dependency check — it reports 503 until the database connection is up,
# which is exactly what an orchestrator should gate traffic on.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/v1/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--env-file-if-exists=.env", "src/server.js"]
