FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV SQLITE_FILE=/app/data/poll-maker.sqlite

RUN mkdir -p /app/data

COPY package*.json ./
RUN npm ci --omit=dev

COPY ./dist ./dist
