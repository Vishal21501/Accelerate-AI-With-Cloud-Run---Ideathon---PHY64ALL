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
ENV VITE_FIREBASE_API_KEY=AIzaSyCMrboGWuaVUr0l8IbCL-kDMBeRG-sOnTE
ENV VITE_FIREBASE_AUTH_DOMAIN=phy64all-app.firebaseapp.com
ENV VITE_FIREBASE_PROJECT_ID=phy64all-app
ENV VITE_FIREBASE_STORAGE_BUCKET=phy64all-app.firebasestorage.app
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=657670240930
ENV VITE_FIREBASE_APP_ID=1:657670240930:web:0c93a0c47e2cff9948f5fb
ENV VITE_FIREBASE_FIRESTORE_DATABASE_ID=ai-studio-phy64all-061a8d58-2882-4b5b-979d-5bef0ed698bd

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
