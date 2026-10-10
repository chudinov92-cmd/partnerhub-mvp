export const INDUSTRY_SEED: string[] = [
  "Природные ресурсы",
  "Промышленность",
  "Строительство и инфраструктура",
  "Торговля",
  "Транспорт и логистика",
  "Финансы",
  "Информационные технологии",
  "Телекоммуникации и связь",
  "Недвижимость",
  "Государственный сектор",
  "Event-индустрия",
  "Искусство",
  "Медиапроизводство и съёмка",
  "Услуги",
];

export const SUBINDUSTRY_SEED: Array<{ industry_label: string; label: string }> = [
  // Природные ресурсы
  { industry_label: "Природные ресурсы", label: "Сельское хозяйство" },
  { industry_label: "Природные ресурсы", label: "Лесное хозяйство" },
  { industry_label: "Природные ресурсы", label: "Рыболовство" },
  { industry_label: "Природные ресурсы", label: "Охота" },
  { industry_label: "Природные ресурсы", label: "Горнодобывающая промышленность" },
  { industry_label: "Природные ресурсы", label: "Нефть и газ" },
  { industry_label: "Природные ресурсы", label: "Энергетика" },
  { industry_label: "Природные ресурсы", label: "Водные ресурсы" },

  // Промышленность
  { industry_label: "Промышленность", label: "Производство" },
  { industry_label: "Промышленность", label: "Машиностроение" },
  { industry_label: "Промышленность", label: "Химическая промышленность" },
  { industry_label: "Промышленность", label: "Металлургия" },
  { industry_label: "Промышленность", label: "Электроника" },
  { industry_label: "Промышленность", label: "Авиационная промышленность" },
  { industry_label: "Промышленность", label: "Космическая промышленность" },
  { industry_label: "Промышленность", label: "Оборонная промышленность" },
  { industry_label: "Промышленность", label: "Биотехнологии" },
  { industry_label: "Промышленность", label: "Фармацевтика" },
  { industry_label: "Промышленность", label: "Робототехника" },

  // Строительство и инфраструктура
  { industry_label: "Строительство и инфраструктура", label: "Строительство" },
  { industry_label: "Строительство и инфраструктура", label: "Архитектура" },
  { industry_label: "Строительство и инфраструктура", label: "Девелопмент" },
  { industry_label: "Строительство и инфраструктура", label: "Инженерия" },
  { industry_label: "Строительство и инфраструктура", label: "Урбанистика" },
  { industry_label: "Строительство и инфраструктура", label: "Дорожное строительство" },
  { industry_label: "Строительство и инфраструктура", label: "ЖКХ" },

  // Торговля
  { industry_label: "Торговля", label: "Оптовая торговля" },
  { industry_label: "Торговля", label: "Розничная торговля" },
  { industry_label: "Торговля", label: "Ecommerce" },
  { industry_label: "Торговля", label: "Маркетплейсы" },
  { industry_label: "Торговля", label: "Dropshipping" },
  { industry_label: "Торговля", label: "Импорт / экспорт" },

  // Транспорт и логистика
  { industry_label: "Транспорт и логистика", label: "Авиация" },
  { industry_label: "Транспорт и логистика", label: "Морские перевозки" },
  { industry_label: "Транспорт и логистика", label: "Железные дороги" },
  { industry_label: "Транспорт и логистика", label: "Автотранспорт" },
  { industry_label: "Транспорт и логистика", label: "Логистика" },
  { industry_label: "Транспорт и логистика", label: "Supply chain" },
  { industry_label: "Транспорт и логистика", label: "Складирование" },
  { industry_label: "Транспорт и логистика", label: "Delivery-сервисы" },

  // Финансы
  { industry_label: "Финансы", label: "Банки" },
  { industry_label: "Финансы", label: "Инвестиции" },
  { industry_label: "Финансы", label: "Страхование" },
  { industry_label: "Финансы", label: "FinTech" },
  { industry_label: "Финансы", label: "Криптоиндустрия" },
  { industry_label: "Финансы", label: "Venture capital" },
  { industry_label: "Финансы", label: "Private equity" },
  { industry_label: "Финансы", label: "Hedge funds" },
  { industry_label: "Финансы", label: "Трейдинг" },

  // Информационные технологии
  { industry_label: "Информационные технологии", label: "Разработка программного обеспечения" },
  { industry_label: "Информационные технологии", label: "Данные и Искусственный Интеллект (Data & AI)" },
  { industry_label: "Информационные технологии", label: "Инфраструктура и Администрирование" },
  { industry_label: "Информационные технологии", label: "Информационная безопасность (InfoSec)" },
  { industry_label: "Информационные технологии", label: "Бизнес-аналитика и Управление проектами" },
  { industry_label: "Информационные технологии", label: "Веб-технологии и Дизайн" },

  // Телекоммуникации и связь
  { industry_label: "Телекоммуникации и связь", label: "Мобильная связь" },
  { industry_label: "Телекоммуникации и связь", label: "Интернет-провайдеры" },
  { industry_label: "Телекоммуникации и связь", label: "Сетевое оборудование" },
  { industry_label: "Телекоммуникации и связь", label: "Спутниковая связь" },
  { industry_label: "Телекоммуникации и связь", label: "5G и новые стандарты" },
  { industry_label: "Телекоммуникации и связь", label: "VoIP и унифицированные коммуникации" },
  { industry_label: "Телекоммуникации и связь", label: "Радиосвязь" },
  { industry_label: "Телекоммуникации и связь", label: "Дата-центры и инфраструктура связи" },

  // Недвижимость
  { industry_label: "Недвижимость", label: "Real estate" },
  { industry_label: "Недвижимость", label: "PropTech" },
  { industry_label: "Недвижимость", label: "Управление недвижимостью" },
  { industry_label: "Недвижимость", label: "Аренда" },
  { industry_label: "Недвижимость", label: "Коммерческая недвижимость" },
  { industry_label: "Недвижимость", label: "Жилая недвижимость" },

  // Государственный сектор
  { industry_label: "Государственный сектор", label: "Государственное управление" },
  { industry_label: "Государственный сектор", label: "Муниципальное управление" },
  { industry_label: "Государственный сектор", label: "Вооружённые силы" },
  { industry_label: "Государственный сектор", label: "Госуслуги" },
  { industry_label: "Государственный сектор", label: "Регулирование" },
  { industry_label: "Государственный сектор", label: "Налоговые службы" },

  // Event-индустрия
  { industry_label: "Event-индустрия", label: "Организация и управление мероприятиями" },
  { industry_label: "Event-индустрия", label: "Event-маркетинг и коммуникации" },
  { industry_label: "Event-индустрия", label: "Режиссура и креативное проектирование" },
  { industry_label: "Event-индустрия", label: "Технический продакшн" },
  { industry_label: "Event-индустрия", label: "Ивент-дизайн и оформление" },

  // Искусство
  { industry_label: "Искусство", label: "Изобразительное искусство" },
  { industry_label: "Искусство", label: "Цифровое искусство и новые медиа" },
  { industry_label: "Искусство", label: "Сценография и театр" },
  { industry_label: "Искусство", label: "Реставрация и консервация" },
  { industry_label: "Искусство", label: "Арт-менеджмент и кураторство" },
  { industry_label: "Искусство", label: "Прикладное творчество и ремесла" },

  // Медиапроизводство и съёмка
  { industry_label: "Медиапроизводство и съёмка", label: "Видеосъёмка" },
  { industry_label: "Медиапроизводство и съёмка", label: "Фотосъёмка" },
  { industry_label: "Медиапроизводство и съёмка", label: "Монтаж и постпродакшн" },
  { industry_label: "Медиапроизводство и съёмка", label: "Звук и саунд-дизайн" },
  { industry_label: "Медиапроизводство и съёмка", label: "Операторское мастерство" },
  { industry_label: "Медиапроизводство и съёмка", label: "Продюсирование и организация съёмок" },

  // Услуги
  { industry_label: "Услуги", label: "Строительство и ремонт" },
  { industry_label: "Услуги", label: "Туризм и путешествия" },
  { industry_label: "Услуги", label: "Транспортные услуги" },
  { industry_label: "Услуги", label: "Образование" },
  { industry_label: "Услуги", label: "Медицина и здоровье" },
  { industry_label: "Услуги", label: "Спорт и фитнес" },
  { industry_label: "Услуги", label: "Beauty-индустрия" },
];

