FROM node:20-alpine AS builder

WORKDIR /app

ARG REACT_APP_API_URL=http://localhost:4000
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Required for Expo web build
ENV CI=false
ENV EXPO_NO_TELEMETRY=1

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# Build web with webpack (more reliable in Docker than expo export)
RUN npx expo export:web

# Production image with nginx
FROM nginx:alpine

COPY --from=builder /app/web-build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
