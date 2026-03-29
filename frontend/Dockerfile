# syntax=docker/dockerfile:1
# Stage 1: build (VITE_API_BASE empty = relative URLs for production)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci
COPY . .
ENV VITE_API_BASE=
RUN npm run build

# Stage 2: serve static files with nginx (SPA routing)
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
