#!/usr/bin/env bash
# Тело для run-purge-profiles-remote.sh (выполняется на VPS).
set -euo pipefail
cd /root/zeip/my-app
docker exec -i supabase-db psql -U supabase_admin -d postgres \
  < supabase/sql/2026-07-28-purge-profiles-whitelist.sql
