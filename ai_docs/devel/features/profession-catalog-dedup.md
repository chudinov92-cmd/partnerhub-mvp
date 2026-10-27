# Дедупликация профессий в каталоге

## Проблема

Пользователь может выбрать «Другое» и ввести профессию, которая уже есть в `profession_catalog`, но с другим регистром или опечаткой. Без нормализации появлялись дубли.

## Решение (3 уровня)

1. **Postgres:** колонка `label_key = lower(btrim(label))`, unique index, триггер перед insert/update.
2. **Клиент:** Fuse.js — inline «Похоже на …» на blur, модалка «Вы имели в виду …?» на save.
3. **Guard:** `shouldUpsertProfession` / `syncCustomProfessionToCatalog` — upsert только если `label_key` новый.

## Код

- Миграция: [`my-app/supabase/sql/2026-09-16-profession-catalog-label-key.sql`](../../../my-app/supabase/sql/2026-09-16-profession-catalog-label-key.sql)
- Утилиты: [`professionCatalogMatch.ts`](../../../my-app/src/lib/professionCatalogMatch.ts)
- UI: [`ProfessionOtherInput.tsx`](../../../my-app/src/components/ProfessionOtherInput.tsx), [`ProfessionDidYouMeanModal.tsx`](../../../my-app/src/components/ProfessionDidYouMeanModal.tsx)
- Экраны: онбординг step 1, `/profile` (основной и доп. блоки, interested_in)

## Supabase

Вставить и выполнить весь файл миграции в SQL Editor.

**VPS:**

```bash
ssh root@186.246.2.104
cd /root/zeip/my-app
bash deploy/timeweb/deploy-app.sh
```

## Поведение UX

| Сценарий | Результат |
|---|---|
| «дизайнер» при наличии «Дизайнер» | blur/save подставляет канонический label, upsert не вызывается |
| «Дизайнерр» (опечатка) | blur — inline; save — модалка до подтверждения |
| «Нет, добавить …» | upsert с `ON CONFLICT (label_key) DO NOTHING` |
| Клик по фону / Escape в модалке | модалка закрывается, сохранение **прерывается**, кастом не создаётся |
