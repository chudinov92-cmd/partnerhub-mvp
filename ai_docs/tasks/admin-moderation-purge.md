# Модерация: hard purge

- [x] SQL: `2026-09-15-admin-moderation-purge.sql` + deploy-app.sh
- [x] API: `/api/admin/users/lookup`, `/api/admin/users/purge`
- [x] UI: `/admin/users` + попап карты
- [x] Письмо + `account_bans` + `ACCOUNT_BANNED` на `/auth`
- [ ] Накатить SQL на prod (VPS)
- [ ] Проверить: шортлинк → purge → письмо → повторная регистрация запрещена

См. [`ai_docs/devel/features/admin-moderation-purge.md`](../devel/features/admin-moderation-purge.md).
