# Performance Rollout (VPS)

## 1) Baseline before deploy

```bash
cd /root/zeip/supabase-stack && ANON_KEY="$(grep -E '^ANON_KEY=' .env | cut -d= -f2-)" && /root/zeip/app/scripts/perf-baseline.sh "$ANON_KEY"
```

## 2) Build locally

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app && npm --prefix "/Users/vladimirchudinov/Desktop/my-startup/my-app" run build
```

## 3) Deploy to VPS

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app && rsync -az --delete --exclude ".next" --exclude "node_modules" ./ root@186.246.2.104:/root/zeip/app/
```

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app && ssh root@186.246.2.104 "cd /root/zeip/app && docker compose build --no-cache && docker compose up -d"
```

## 4) Verify after deploy

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app && ssh root@186.246.2.104 "cd /root && curl -I https://zeip.ru/"
```

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app && ssh root@186.246.2.104 "cd /root/zeip/supabase-stack && ANON_KEY=\"\$(grep -E '^ANON_KEY=' .env | cut -d= -f2-)\" && curl -sS -o /dev/null -w \"%{http_code}\\n\" -H \"apikey: \$ANON_KEY\" -H \"Authorization: Bearer \$ANON_KEY\" \"https://supabase.zeip.ru/rest/v1/\""
```

## 5) Compare baseline after deploy

```bash
cd /Users/vladimirchudinov/Desktop/my-startup/my-app && ssh root@186.246.2.104 "cd /root/zeip/supabase-stack && ANON_KEY=\"\$(grep -E '^ANON_KEY=' .env | cut -d= -f2-)\" && /root/zeip/app/scripts/perf-baseline.sh \"\$ANON_KEY\""
```
