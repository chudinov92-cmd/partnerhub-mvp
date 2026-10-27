# admin

Библиотека внутренней админ-панели Zeip: сервисы, UI-компоненты и страницы модерации, аналитики и управления.

## Состав

| Модуль | Назначение |
|---|---|
| `services/adminService.ts` | Supabase-запросы (admin-сервисы, auth-хелперы, RLS-защищённые чтения/мутации) |
| `services/analyticsService.ts` | Фетчеры аналитики (воронка пейвола, MRR, спрос) |
| `hooks/useIsSuperAdmin.ts` | Хук проверки роли super_admin (один запрос, кеш) |
| `components/AdminShell.tsx` | Шелл админки: аутентификация, навигация по ролям |
| `components/ModerationPurgeDialog.tsx` | Диалог hard purge аккаунта (только super_admin) |
| `components/RevenueAnalytics.tsx` | MRR-график, активные Pro/Pro+, LTV |
| `components/PaywallFunnelAnalytics.tsx` | Воронка пейвола |
| `components/ProfessionDemandAnalytics.tsx` | Матрица спроса по профессиям |
| `pages/Admin*Page.tsx` | 8 именованных страниц-компонентов |
| `errors.ts` | Утилита `getErrorMessage` (локальная копия) |
| `api-contracts.ts` | Типы и константы, общие для клиента и сервера |

## Зависимости

- `@my-startup/auth` — Supabase-клиент
- `@my-startup/chat` — компоненты и утилиты чата
- `@my-startup/profile` — тип `FeedFilters`

## Сборка

```bash
nx build admin
```
