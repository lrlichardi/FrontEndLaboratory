FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build   # Vite/CRA: genera /app/dist o /app/build

FROM nginx:alpine
# Si usas Vite, dist; si CRA, build:
COPY --from=build /app/dist /usr/share/nginx/html
COPY client/docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80