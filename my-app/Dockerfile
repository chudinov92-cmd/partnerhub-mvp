# Монопрепо-сборка. Контекст сборки — КОРЕНЬ репозитория (содержит my-app/ и libs/).
# В docker-compose.app.yml контекст = "../../" от deploy/timeweb = корень, dockerfile = my-app/Dockerfile.
# library/ подключаются через my-app/package.json как file:../libs/*, а postinstall
# (scripts/setup-myapp-libs.sh) копирует libs/* в my-app/node_modules/@my-startup/* (TS-исходники).

FROM public.ecr.aws/docker/library/node:20-alpine AS deps
WORKDIR /workspace
# Библиотеки и их справка по сборке (только src+package.json+tsconfig достаточно, но копируем libs целиком).
COPY libs ./libs
COPY my-app/package.json my-app/package-lock.json ./my-app/
COPY scripts/setup-myapp-libs.sh ./scripts/setup-myapp-libs.sh
# npm ci в my-app запускает postinstall → setup-myapp-libs.sh скопирует libs/* в node_modules/@my-startup/*.
RUN cd my-app && npm ci

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
ARG NEXT_PUBLIC_ACCESS_MODE=freemium
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_SUPPORT_PROFILE_ID=$NEXT_PUBLIC_SUPPORT_PROFILE_ID
ENV NEXT_PUBLIC_VK_MAPS_API_KEY=$NEXT_PUBLIC_VK_MAPS_API_KEY
ENV NEXT_PUBLIC_ROBOKASSA_MERCHANT_LOGIN=$NEXT_PUBLIC_ROBOKASSA_MERCHANT_LOGIN
ENV NEXT_PUBLIC_ACCESS_MODE=$NEXT_PUBLIC_ACCESS_MODE
# Собираем в my-app: исходники приложения, затем node_modules из deps (чтобы COPY не затёр их).
COPY my-app ./my-app
COPY --from=deps /workspace/my-app/node_modules ./my-app/node_modules
WORKDIR /app/my-app
RUN npm run build

FROM public.ecr.aws/docker/library/node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/my-app/public ./public
COPY --from=builder /app/my-app/.next/standalone ./
COPY --from=builder /app/my-app/.next/static ./.next/static
# nextjs не может писать в .next/cache без явных прав (EACCES в runtime)
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
