# syntax=docker/dockerfile:1.7
#
# Paragon en Google Cloud Run (10 nov 2026, mudanza desde Vercel por el
# límite de CPU de su plan gratis). Next.js en modo `standalone`: la imagen
# final lleva solo server.js, los node_modules que de verdad se usan y los
# estáticos. Lo construye y publica .github/workflows/desplegar-cloud-run.yml.
#
# Las variables de entorno de compilación (NEXT_PUBLIC_*, DATABASE_URL si
# alguna página se genera al compilar…) llegan como secreto de BuildKit
# (`--secret id=entorno`) montado como `.env.production.local`, que Next lee
# solo: no quedan en ninguna capa de la imagen. Las de ejecución las pone
# Cloud Run (`--env-vars-file`).

FROM node:22-bookworm-slim AS dependencias
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-bookworm-slim AS compilacion
WORKDIR /app
# PARAGON_PRODUCCION: URLs absolutas con el dominio de verdad (lib/site.ts),
# también en lo que se genera al compilar (robots.txt, sitemap…).
ENV NEXT_TELEMETRY_DISABLED=1 \
    PARAGON_PRODUCCION=1
COPY --from=dependencias /app/node_modules ./node_modules
COPY . .
ARG GIT_SHA=dev
ENV GIT_SHA=$GIT_SHA
RUN --mount=type=secret,id=entorno,target=/app/.env.production.local,required=false \
    npm run build \
    # Por si Next copiara el .env a la carpeta standalone: fuera de la imagen.
    && rm -f .next/standalone/.env*

FROM node:22-bookworm-slim AS ejecucion
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PARAGON_PRODUCCION=1 \
    PORT=8080 \
    HOSTNAME=0.0.0.0
COPY --from=compilacion --chown=node:node /app/public ./public
COPY --from=compilacion --chown=node:node /app/.next/standalone ./
COPY --from=compilacion --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 8080
CMD ["node", "server.js"]
