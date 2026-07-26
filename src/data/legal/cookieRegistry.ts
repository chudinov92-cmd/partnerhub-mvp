export type CookieStorageType =
  | "HTTP cookie"
  | "localStorage"
  | "sessionStorage"
  | "Серверная БД";

export type CookieCategory =
  | "Необходимые"
  | "Функциональные"
  | "Аналитические"
  | "Маркетинговые"
  | "Сторонний оператор";

export type CookieRegistryEntry = {
  name: string;
  storageType: CookieStorageType;
  category: CookieCategory;
  purpose: string;
  retention: string;
  consentRequired: boolean;
  provider: string;
  domain: string;
};

export type CookieRegistrySection = {
  id: string;
  title: string;
  description?: string;
  entries: CookieRegistryEntry[];
};

export const COOKIE_REGISTRY_SECTIONS: CookieRegistrySection[] = [
  {
    id: "http-necessary",
    title: "HTTP cookie — необходимые",
    description:
      "Без этих cookie авторизация и работа сервиса невозможны. Активируются автоматически.",
    entries: [
      {
        name: "sb-*-auth-token",
        storageType: "HTTP cookie",
        category: "Необходимые",
        purpose:
          "Токены сессии Supabase Auth: вход в аккаунт, поддержание авторизованной сессии.",
        retention: "До выхода из аккаунта или истечения срока действия сессии",
        consentRequired: false,
        provider: "Supabase (self-hosted на supabase.zeip.ru)",
        domain: "zeip.ru",
      },
    ],
  },
  {
    id: "http-analytics",
    title: "HTTP cookie — аналитические",
    description:
      "Активируются только после нажатия кнопки «Согласен» в баннере cookie. Счётчик Яндекс.Метрика ID 110816502.",
    entries: [
      {
        name: "_ym_uid",
        storageType: "HTTP cookie",
        category: "Аналитические",
        purpose: "Уникальный идентификатор пользователя для Яндекс.Метрики.",
        retention: "До 1 года (по политике ООО «ЯНДЕКС»)",
        consentRequired: true,
        provider: "ООО «ЯНДЕКС» (Яндекс.Метрика)",
        domain: ".yandex.ru / zeip.ru",
      },
      {
        name: "_ym_d",
        storageType: "HTTP cookie",
        category: "Аналитические",
        purpose: "Дата первого визита пользователя для Яндекс.Метрики.",
        retention: "До 1 года",
        consentRequired: true,
        provider: "ООО «ЯНДЕКС» (Яндекс.Метрика)",
        domain: "zeip.ru",
      },
      {
        name: "_ym_isad",
        storageType: "HTTP cookie",
        category: "Аналитические",
        purpose: "Признак использования блокировщика рекламы.",
        retention: "До 2 суток",
        consentRequired: true,
        provider: "ООО «ЯНДЕКС» (Яндекс.Метрика)",
        domain: "zeip.ru",
      },
      {
        name: "_ym_visorc*",
        storageType: "HTTP cookie",
        category: "Аналитические",
        purpose: "Сессия веб-визора Яндекс.Метрики (запись действий на странице).",
        retention: "До 30 минут",
        consentRequired: true,
        provider: "ООО «ЯНДЕКС» (Яндекс.Метрика)",
        domain: "zeip.ru",
      },
      {
        name: "yandexuid, ymex, yuidss",
        storageType: "HTTP cookie",
        category: "Аналитические",
        purpose: "Идентификаторы и параметры сессии Яндекс.Метрики.",
        retention: "До 1 года (по политике ООО «ЯНДЕКС»)",
        consentRequired: true,
        provider: "ООО «ЯНДЕКС» (Яндекс.Метрика)",
        domain: ".yandex.ru",
      },
    ],
  },
  {
    id: "http-marketing",
    title: "HTTP cookie — маркетинговые",
    description:
      "Активируются только после нажатия кнопки «Согласен». Пиксель VK Реклама / Top.Mail.Ru ID 3780633.",
    entries: [
      {
        name: "_tmr_*",
        storageType: "HTTP cookie",
        category: "Маркетинговые",
        purpose:
          "Идентификаторы Top.Mail.Ru / VK Реклама для формирования рекламных аудиторий и оценки конверсий.",
        retention: "До 1 года (по политике VK / Mail.ru Group)",
        consentRequired: true,
        provider: "VK / Mail.ru Group (Top.Mail.Ru)",
        domain: ".mail.ru / zeip.ru",
      },
      {
        name: "tmr_*",
        storageType: "HTTP cookie",
        category: "Маркетинговые",
        purpose: "Служебные cookie счётчика Top.Mail.Ru.",
        retention: "До 1 года",
        consentRequired: true,
        provider: "VK / Mail.ru Group (Top.Mail.Ru)",
        domain: ".mail.ru / zeip.ru",
      },
    ],
  },
  {
    id: "localstorage-necessary",
    title: "localStorage — необходимые",
    entries: [
      {
        name: "anonymous_uid",
        storageType: "localStorage",
        category: "Необходимые",
        purpose:
          "Анонимный UUID гостя для привязки записи согласия на cookie до регистрации.",
        retention: "До очистки данных сайта пользователем",
        consentRequired: false,
        provider: "ООО «ЗЕИП»",
        domain: "zeip.ru",
      },
    ],
  },
  {
    id: "localstorage-functional",
    title: "localStorage — функциональные",
    entries: [
      {
        name: "cookie_consent",
        storageType: "localStorage",
        category: "Функциональные",
        purpose:
          "Фиксация факта согласия пользователя на обработку cookie (значение «accepted»).",
        retention: "До отзыва согласия или очистки данных сайта",
        consentRequired: true,
        provider: "ООО «ЗЕИП»",
        domain: "zeip.ru",
      },
      {
        name: "selected_city",
        storageType: "localStorage",
        category: "Функциональные",
        purpose: "Выбранный пользователем город для карты и ленты.",
        retention: "До очистки данных сайта",
        consentRequired: false,
        provider: "ООО «ЗЕИП»",
        domain: "zeip.ru",
      },
      {
        name: "city_onboarding_acknowledged",
        storageType: "localStorage",
        category: "Функциональные",
        purpose: "Статус ознакомления с подсказками интерфейса выбора города.",
        retention: "До очистки данных сайта",
        consentRequired: false,
        provider: "ООО «ЗЕИП»",
        domain: "zeip.ru",
      },
      {
        name: "feed_filters",
        storageType: "localStorage",
        category: "Функциональные",
        purpose: "Сохранённые параметры фильтров ленты на карте.",
        retention: "До очистки данных сайта",
        consentRequired: false,
        provider: "ООО «ЗЕИП»",
        domain: "zeip.ru",
      },
      {
        name: "zeip_push_dismissed_at",
        storageType: "localStorage",
        category: "Функциональные",
        purpose: "Время отклонения предложения подписаться на push-уведомления.",
        retention: "7 дней",
        consentRequired: false,
        provider: "ООО «ЗЕИП»",
        domain: "zeip.ru",
      },
    ],
  },
  {
    id: "localstorage-catalog",
    title: "localStorage — кэши справочников",
    description: "Обновляются автоматически не чаще одного раза в сутки (после 04:00 МСК).",
    entries: [
      {
        name: "profession_catalog_v2",
        storageType: "localStorage",
        category: "Функциональные",
        purpose: "Кэш справочника профессий для автодополнения в профиле.",
        retention: "До следующего обновления (04:00 МСК)",
        consentRequired: false,
        provider: "ООО «ЗЕИП»",
        domain: "zeip.ru",
      },
      {
        name: "profession_catalog_fetched_at_v2",
        storageType: "localStorage",
        category: "Функциональные",
        purpose: "Метка времени последней загрузки справочника профессий.",
        retention: "До следующего обновления (04:00 МСК)",
        consentRequired: false,
        provider: "ООО «ЗЕИП»",
        domain: "zeip.ru",
      },
      {
        name: "industry_catalog_v2",
        storageType: "localStorage",
        category: "Функциональные",
        purpose: "Кэш справочника отраслей.",
        retention: "До следующего обновления (04:00 МСК)",
        consentRequired: false,
        provider: "ООО «ЗЕИП»",
        domain: "zeip.ru",
      },
      {
        name: "industry_catalog_fetched_at_v2",
        storageType: "localStorage",
        category: "Функциональные",
        purpose: "Метка времени последней загрузки справочника отраслей.",
        retention: "До следующего обновления (04:00 МСК)",
        consentRequired: false,
        provider: "ООО «ЗЕИП»",
        domain: "zeip.ru",
      },
      {
        name: "subindustry_catalog_v2",
        storageType: "localStorage",
        category: "Функциональные",
        purpose: "Кэш справочника подотраслей.",
        retention: "До следующего обновления (04:00 МСК)",
        consentRequired: false,
        provider: "ООО «ЗЕИП»",
        domain: "zeip.ru",
      },
      {
        name: "subindustry_catalog_fetched_at_v2",
        storageType: "localStorage",
        category: "Функциональные",
        purpose: "Метка времени последней загрузки справочника подотраслей.",
        retention: "До следующего обновления (04:00 МСК)",
        consentRequired: false,
        provider: "ООО «ЗЕИП»",
        domain: "zeip.ru",
      },
    ],
  },
  {
    id: "sessionstorage",
    title: "sessionStorage",
    entries: [
      {
        name: "zeip_password_reset_complete",
        storageType: "sessionStorage",
        category: "Необходимые",
        purpose:
          "Флаг успешного сброса пароля для корректного завершения сценария восстановления доступа.",
        retention: "5 минут",
        consentRequired: false,
        provider: "ООО «ЗЕИП»",
        domain: "zeip.ru",
      },
    ],
  },
  {
    id: "server-db",
    title: "Серверная БД — журнал согласий",
    entries: [
      {
        name: "cookie_consent_logs",
        storageType: "Серверная БД",
        category: "Функциональные",
        purpose:
          "Журнал согласий: anonymous_uid, policy_version, consent_type, маскированный IP-адрес, User-Agent, дата согласия; user_id после авторизации.",
        retention: "3 года",
        consentRequired: true,
        provider: "ООО «ЗЕИП» (Supabase, supabase.zeip.ru, РФ)",
        domain: "supabase.zeip.ru",
      },
    ],
  },
  {
    id: "third-party-payment",
    title: "Сторонний оператор — при оплате",
    description:
      "Cookie устанавливаются только при переходе на страницу оплаты Robokassa. Оператор Zeip не контролирует их состав.",
    entries: [
      {
        name: "cookie домена auth.robokassa.ru",
        storageType: "HTTP cookie",
        category: "Сторонний оператор",
        purpose:
          "Сессия платёжной формы Robokassa при оплате подписки Pro. Данные банковской карты обрабатываются Robokassa, не хранятся у Оператора.",
        retention: "Сессия оплаты",
        consentRequired: false,
        provider: "ООО «РОБОКАССА»",
        domain: "auth.robokassa.ru",
      },
    ],
  },
];
