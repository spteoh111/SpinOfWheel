# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_APP_NAME
ARG NEXT_PUBLIC_APP_DESCRIPTION
ARG NEXT_PUBLIC_SITE_LABEL
ARG NEXT_PUBLIC_APP_CREDIT
ARG NEXT_PUBLIC_LOGO_SRC
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_APP_DESCRIPTION=$NEXT_PUBLIC_APP_DESCRIPTION
ENV NEXT_PUBLIC_SITE_LABEL=$NEXT_PUBLIC_SITE_LABEL
ENV NEXT_PUBLIC_APP_CREDIT=$NEXT_PUBLIC_APP_CREDIT
ENV NEXT_PUBLIC_LOGO_SRC=$NEXT_PUBLIC_LOGO_SRC
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3087
ENV HOSTNAME=0.0.0.0

RUN addgroup -S nodegrp && adduser -S nodeusr -G nodegrp

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nodeusr:nodegrp /app/.next/standalone ./
COPY --from=builder --chown=nodeusr:nodegrp /app/.next/static ./.next/static

USER nodeusr
EXPOSE 3087
CMD ["node", "server.js"]
