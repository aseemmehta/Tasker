# Dev server (hot reload)
FROM node:22-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
EXPOSE 5273
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Production build
FROM dev AS build
# Public build-time values, passed in by docker compose from .env (the .env file itself is not copied into the image)
ARG VITE_GOOGLE_CLIENT_ID=
ARG VITE_GA_MEASUREMENT_ID=
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_GA_MEASUREMENT_ID=$VITE_GA_MEASUREMENT_ID
RUN npm run build

# Static site served by nginx
FROM nginx:alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
