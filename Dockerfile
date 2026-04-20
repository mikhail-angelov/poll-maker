FROM node:20-alpine

ENV NODE_ENV=production

RUN mkdir -p /app
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY ./dist ./dist
