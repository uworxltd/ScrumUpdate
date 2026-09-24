# Stage 1: Install dependencies for the entire workspace
FROM node:18.20.6-alpine AS deps

WORKDIR /app

COPY package.json yarn.lock ./
COPY angular/package.json angular/
COPY express/package.json express/

RUN yarn install --frozen-lockfile

# Stage 2: Build Angular application
FROM deps AS angular-builder

COPY angular/angular.json angular/tsconfig*.json angular/
COPY angular/src ./angular/src/

RUN yarn workspace khoji-angular docker

# Stage 3: Build Express server
FROM deps AS express-builder

COPY express/tsconfig.json express/
COPY express/server.ts express/
COPY express/api ./express/api/
COPY express/utils ./express/utils/

RUN yarn workspace khoji-express build

# Stage 4: Install production-only dependencies
FROM node:18.20.6-alpine AS prod-deps

WORKDIR /app

COPY package.json yarn.lock ./
COPY express/package.json express/

RUN yarn install --frozen-lockfile --production

# Stage 5: Final production image
FROM node:18.20.6-alpine AS prod

WORKDIR /app

# Install gettext for envsubst
RUN apk add --no-cache gettext

# Copy only the built Angular artifacts from the builder stage
COPY --from=angular-builder /app/angular/dist/ /app/dist/

# Copy built Express server from express-builder stage
COPY --from=express-builder /app/express/dist/ /app/dist-server/

# Copy dependencies and production files
COPY --from=prod-deps /app/node_modules ./node_modules
COPY docker-entrypoint.sh ./

RUN chmod 755 /app/docker-entrypoint.sh

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8081
# Set the path to the Angular dist directory for the entrypoint script
ENV APP_DIST=/app/dist

EXPOSE 8081

ENTRYPOINT ["/bin/sh", "/app/docker-entrypoint.sh"]
# Self-report health to Docker: /api/status is the Express BFF liveness probe.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["wget", "-q", "-O", "/dev/null", "http://localhost:8081/api/status"]
CMD ["node", "dist-server/server.js"]