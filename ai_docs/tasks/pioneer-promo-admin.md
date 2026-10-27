# Пионерская акция: тумблер в админке и 100 слотов Pro+ для Перми

- [x] SQL: `2026-09-16-pioneer-promo-admin.sql` — `pioneer_promo_settings`, `claim_pioneer_slot` читает флаг и выдаёт Pro+ 90 дней, Пермь `max_count = 100`
- [x] Админка: `/admin/promo` (super_admin) — тумблер, лимиты по городам, `admin_audit_log`
- [x] Квиз: флаг из БД, RPC только `p_city`, тексты Pro+
- [x] Убран `NEXT_PUBLIC_PIONEER_PROMO_ENABLED` из Docker / `.env.app.example`
- [ ] Накатить SQL на prod (VPS)
- [ ] Включить акцию тумблером на `/admin/promo`, когда нужно
- [ ] Проверить квиз: Пермь, новый аккаунт после cutoff → Pro+ на 90 дней

См. [`ai_docs/devel/features/onboarding-funnel.md`](../devel/features/onboarding-funnel.md)
