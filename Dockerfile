# public.ecr.aws — зеркало Docker Hub без жёсткого rate limit (429 на VPS).
FROM public.ecr.aws/docker/library/node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM public.ecr.aws/docker/library/node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* вшиваются в клиент на этапе build — без этого env_file у контейнера не помогает.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG NEXT_PUBLIC_SUPPORT_PROFILE_ID
ARG NEXT_PUBLIC_VK_MAPS_API_KEY
ARG NEXT_PUBLIC_ROBOKASSA_MERCHANT_LOGIN
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_SUPPORT_PROFILE_ID=$NEXT_PUBLIC_SUPPORT_PROFILE_ID
ENV NEXT_PUBLIC_VK_MAPS_API_KEY=$NEXT_PUBLIC_VK_MAPS_API_KEY
ENV NEXT_PUBLIC_ROBOKASSA_MERCHANT_LOGIN=$NEXT_PUBLIC_ROBOKASSA_MERCHANT_LOGIN
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM public.ecr.aws/docker/library/node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# nextjs не может писать в .next/cache без явных прав (EACCES в runtime)
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
