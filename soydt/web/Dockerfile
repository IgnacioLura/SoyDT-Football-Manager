# Standalone web image, decoupled from the API's release cadence.
# Build context is soydt/web itself, e.g.:
#   docker build -f soydt/web/Dockerfile -t soydt-web soydt/web

FROM node:22-bookworm AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /src/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
