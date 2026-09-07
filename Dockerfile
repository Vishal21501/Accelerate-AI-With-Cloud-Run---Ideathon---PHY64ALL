# Multi-stage production build for Cloud Run
FROM node:22-slim AS builder
WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci || npm install

# Copy source code and build production assets
COPY . .
ENV NODE_ENV=production
# Built-in Firebase configuration defaults for client bundle
ENV VITE_FIREBASE_API_KEY=api
ENV VITE_FIREBASE_AUTH_DOMAIN=authdom
ENV VITE_FIREBASE_PROJECT_ID=id
ENV VITE_FIREBASE_STORAGE_BUCKET=bucket
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=msgid
ENV VITE_FIREBASE_APP_ID=appid
ENV VITE_FIREBASE_FIRESTORE_DATABASE_ID=dbid

RUN npm run build

# Production runtime container
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy compiled frontend and backend bundles from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json

# Cloud Run container port
EXPOSE 3000

# Start production server
CMD ["node", "dist/server.cjs"]
