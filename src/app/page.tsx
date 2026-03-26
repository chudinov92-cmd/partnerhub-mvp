"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { PartnerMapProps } from "@/components/PartnerMap";
import { supabase } from "@/lib/supabaseClient";
import { maskProfanity } from "@/lib/profanity";
import {
  getProfessionLabelsForSelect,
  loadProfessionCatalog,
  type ProfessionCatalogRow,
} from "@/lib/professionCatalog";
import { DropdownSelect } from "@/components/DropdownSelect";
import {
  getIndustryLabelsForSelect,
  getSubindustryLabelsForSelect,
  loadIndustryCatalog,
  loadSubindustryCatalog,
  type IndustryCatalogRow,
  type SubindustryCatalogRow,
} from "@/lib/industryCatalog";
import { getBrowserTimeZone, getTimeZoneByCity } from "@/lib/cityTimezone";

const PartnerMap = dynamic<PartnerMapProps>(
  () => import("@/components/PartnerMap").then((m) => m.PartnerMap),
  { ssr: false },
);

type Post = {
  id: string;
  body: string | null;
  city: string | null;
  created_at: string;
  author_id: string;
  // Структура автора приходит из Supabase как вложенный объект/массив,
  // для простоты типизируем как any и обрабатываем на уровне рендера.
  author: any;
};

type Profile = {
  id: string;
  full_name: string | null;
  city: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  last_seen_at?: string | null;
  skills?: string | null;
  resources?: string | null;
  industry?: string | null;
  subindustry?: string | null;
  role_title?: string | null;
  experience_years?: number | null;
  current_status?: string | null;
};

const ONLINE_WINDOW_MS = 2 * 60 * 1000;

function isOnline(lastSeenAt?: string | null) {
  if (!lastSeenAt) return false;
  const t = new Date(lastSeenAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= ONLINE_WINDOW_MS;
}

type ChatListItem = {
  chatId: string;
  profile: Profile;
  lastMessageAt: string | null;
};

const INDUSTRY_OPTIONS = [
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
  "Другое",
] as const;

type Industry = (typeof INDUSTRY_OPTIONS)[number];

function sortRuAsc(a: string, b: string) {
  return a.localeCompare(b, "ru");
}

function sortWithOtherLast(items: readonly string[]) {
  const other = "Другое";
  const rest = items.filter((x) => x !== other).slice().sort(sortRuAsc);
  return items.includes(other) ? [...rest, other] : rest;
}

const SORTED_INDUSTRY_OPTIONS = sortWithOtherLast(INDUSTRY_OPTIONS);

const CURRENT_STATUS_OPTIONS = [
  "Учащийся",
  "Сотрудник в компании",
  "Предприниматель",
  "Фрилансер",
].slice().sort(sortRuAsc);

const SUBINDUSTRY_OPTIONS: Partial<Record<Industry, string[]>> = {
  "Природные ресурсы": [
    "Сельское хозяйство",
    "Лесное хозяйство",
    "Рыболовство",
    "Охота",
    "Горнодобывающая промышленность",
    "Нефть и газ",
    "Энергетика",
    "Водные ресурсы",
  ],
  Промышленность: [
    "Производство",
    "Машиностроение",
    "Химическая промышленность",
    "Металлургия",
    "Электроника",
    "Авиационная промышленность",
    "Космическая промышленность",
    "Оборонная промышленность",
    "Биотехнологии",
    "Фармацевтика",
    "Робототехника",
  ],
  "Строительство и инфраструктура": [
    "Строительство",
    "Архитектура",
    "Девелопмент",
    "Инженерия",
    "Урбанистика",
    "Дорожное строительство",
    "ЖКХ",
  ],
  Торговля: [
    "Оптовая торговля",
    "Розничная торговля",
    "Ecommerce",
    "Маркетплейсы",
    "Dropshipping",
    "Импорт / экспорт",
  ],
  "Транспорт и логистика": [
    "Авиация",
    "Морские перевозки",
    "Железные дороги",
    "Автотранспорт",
    "Логистика",
    "Supply chain",
    "Складирование",
    "Delivery-сервисы",
  ],
  Финансы: [
    "Банки",
    "Инвестиции",
    "Страхование",
    "FinTech",
    "Криптоиндустрия",
    "Venture capital",
    "Private equity",
    "Hedge funds",
    "Трейдинг",
  ],
  "Информационные технологии": [
    "Разработка программного обеспечения",
    "Данные и Искусственный Интеллект (Data & AI)",
    "Инфраструктура и Администрирование",
    "Информационная безопасность (InfoSec)",
    "Бизнес-аналитика и Управление проектами",
    "Веб-технологии и Дизайн",
  ],
  "Телекоммуникации и связь": [
    "Мобильная связь",
    "Интернет-провайдеры",
    "Сетевое оборудование",
    "Спутниковая связь",
    "5G и новые стандарты",
    "VoIP и унифицированные коммуникации",
    "Радиосвязь",
    "Дата-центры и инфраструктура связи",
  ],
  Недвижимость: [
    "Real estate",
    "PropTech",
    "Управление недвижимостью",
    "Аренда",
    "Коммерческая недвижимость",
    "Жилая недвижимость",
  ],
  "Государственный сектор": [
    "Государственное управление",
    "Муниципальное управление",
    "Вооружённые силы",
    "Госуслуги",
    "Регулирование",
    "Налоговые службы",
  ],
  "Event-индустрия": [
    "Организация и управление мероприятиями",
    "Event-маркетинг и коммуникации",
    "Режиссура и креативное проектирование",
    "Технический продакшн",
    "Ивент-дизайн и оформление",
  ],
  Искусство: [
    "Изобразительное искусство",
    "Цифровое искусство и новые медиа",
    "Сценография и театр",
    "Реставрация и консервация",
    "Арт-менеджмент и кураторство",
    "Прикладное творчество и ремесла",
  ],
  "Медиапроизводство и съёмка": [
    "Видеосъёмка",
    "Фотосъёмка",
    "Монтаж и постпродакшн",
    "Звук и саунд-дизайн",
    "Операторское мастерство",
    "Продюсирование и организация съёмок",
  ],
  Услуги: [
    "Строительство и ремонт",
    "Туризм и путешествия",
    "Транспортные услуги",
    "Образование",
    "Медицина и здоровье",
    "Спорт и фитнес",
    "Beauty-индустрия",
  ],
};

type FeedFilters = {
  profession: string | null;
  industry: string | null;
  subindustry: string | null;
  current_status: string | null;
};

const DEFAULT_FEED_FILTERS: FeedFilters = {
  profession: null,
  industry: null,
  subindustry: null,
  current_status: null,
};

type CurrentUser = {
  profileId: string;
  fullName: string | null;
  city: string | null;
  isBlocked: boolean;
};

type ChatMessage = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
};

import { RUSSIA_LABEL, SORTED_CITY_OPTIONS } from "@/data/cities";

type CityViewConfig = {
  center: [number, number];
  zoom: number;
};

const CITY_VIEWS: Record<string, CityViewConfig> = {
  Россия: {
    center: [61, 90],
    zoom: 3,
  },
  Москва: {
    center: [55.7558, 37.6176],
    zoom: 10,
  },
  "Санкт-Петербург": {
    center: [59.9311, 30.3609],
    zoom: 10,
  },
  Новосибирск: {
    center: [55.0084, 82.9357],
    zoom: 10,
  },
  Екатеринбург: {
    center: [56.8389, 60.6057],
    zoom: 10,
  },
  Казань: {
    center: [55.7963, 49.1088],
    zoom: 10,
  },
  "Нижний Новгород": {
    center: [56.2965, 43.9361],
    zoom: 10,
  },
  Челябинск: {
    center: [55.1644, 61.4368],
    zoom: 10,
  },
  Самара: {
    center: [53.1959, 50.1008],
    zoom: 10,
  },
  Омск: {
    center: [54.9885, 73.3242],
    zoom: 10,
  },
  "Ростов-на-Дону": {
    center: [47.2357, 39.7015],
    zoom: 10,
  },
  Уфа: {
    center: [54.7388, 55.9721],
    zoom: 10,
  },
  Красноярск: {
    center: [56.0153, 92.8932],
    zoom: 10,
  },
  Пермь: {
    center: [58.01, 56.25],
    zoom: 12,
  },
  Волгоград: {
    center: [48.708, 44.5133],
    zoom: 10,
  },
  Воронеж: {
    center: [51.6608, 39.2003],
    zoom: 10,
  },
};

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [chatList, setChatList] = useState<ChatListItem[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(
    () => new Set(),
  );
  const [feedFiltersOpen, setFeedFiltersOpen] = useState(false);
  const [feedFilters, setFeedFilters] = useState<FeedFilters>(
    () => DEFAULT_FEED_FILTERS,
  );
  const [newPostBody, setNewPostBody] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [activeChatUser, setActiveChatUser] = useState<Profile | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatSending, setChatSending] = useState(false);
  const [unreadByUser, setUnreadByUser] = useState<Record<string, number>>({});
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatWindowRef = useRef<HTMLDivElement | null>(null);
  const [activeProfileCard, setActiveProfileCard] = useState<{
    profile: Profile;
    top: number;
    left?: number;
  } | null>(null);
  const [experienceSumByKey, setExperienceSumByKey] = useState<
    Record<string, number>
  >({});
  const [cityMenuOpen, setCityMenuOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const cityMenuRef = useRef<HTMLDivElement | null>(null);
  const feedFiltersRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [contactProfileIds, setContactProfileIds] = useState<string[]>([]);
  const [contactsOnlyMode, setContactsOnlyMode] = useState(false);

  const timeZone = useMemo(() => {
    const tzFromProfileCity = getTimeZoneByCity(currentUser?.city);
    return tzFromProfileCity ?? getBrowserTimeZone() ?? "Europe/Moscow";
  }, [currentUser?.city]);

  const getTotalExperienceYears = (profileId: string, roleTitle: string | null | undefined) => {
    if (!profileId || !roleTitle) return null;
    const key = `${profileId}::${roleTitle}`;
    const v = experienceSumByKey[key];
    return typeof v === "number" ? v : null;
  };

  // загружаем выбранный город из localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("selected_city");
    if (saved) {
      setSelectedCity(saved);
    } else {
      setSelectedCity("Пермь");
    }
  }, []);

  // режим "Контакты" включаем через query-param ?contacts=1
  // (Next router меняет URL через history.pushState, поэтому слушаем изменения location.search)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const read = () => {
      const params = new URLSearchParams(window.location.search);
      setContactsOnlyMode(params.get("contacts") === "1");
    };

    read();

    const onLocationChange = () => read();

    const origPush = history.pushState;
    const origReplace = history.replaceState;

    history.pushState = function (
      this: History,
      ...args: Parameters<History["pushState"]>
    ) {
      const ret = origPush.apply(this, args as any);
      window.dispatchEvent(new Event("locationchange"));
      return ret;
    } as any;
    history.replaceState = function (
      this: History,
      ...args: Parameters<History["replaceState"]>
    ) {
      const ret = origReplace.apply(this, args as any);
      window.dispatchEvent(new Event("locationchange"));
      return ret;
    } as any;

    window.addEventListener("popstate", onLocationChange);
    window.addEventListener("locationchange", onLocationChange);

    return () => {
      history.pushState = origPush;
      history.replaceState = origReplace;
      window.removeEventListener("popstate", onLocationChange);
      window.removeEventListener("locationchange", onLocationChange);
    };
  }, []);

  // подгружаем сохранённые фильтры ленты
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("feed_filters");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as FeedFilters;
      setFeedFilters({
        ...DEFAULT_FEED_FILTERS,
        ...parsed,
      });
    } catch {
      // ignore
    }
  }, []);

  // загрузка контактов текущего пользователя
  useEffect(() => {
    if (!currentUser?.profileId) {
      setContactProfileIds([]);
      return;
    }
    let alive = true;
    supabase
      .from("profile_contacts")
      .select("contact_profile_id")
      .eq("owner_id", currentUser.profileId)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          console.error("Failed to load contacts", error);
          setContactProfileIds([]);
          return;
        }
        const ids =
          (data as any[] | null)?.map((r) => r.contact_profile_id) ?? [];
        setContactProfileIds(ids);
      });
    return () => {
      alive = false;
    };
  }, [currentUser?.profileId]);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        setLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        const [
          { data: postsData, error: postsError },
          { data: profilesData, error: profilesError },
          currentProfileResult,
        ] = await Promise.all([
          supabase
            .from("posts")
            .select(
              "id, body, city, created_at, author_id, author:profiles(full_name, role_title, last_seen_at, current_status, experience_years, industry, subindustry)",
            )
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("profiles")
            .select(
              "id, full_name, city, industry, subindustry, role_title, last_seen_at, skills, resources, current_status, experience_years, rating_avg, rating_count",
            )
            .limit(50),
          user
            ? supabase
                .from("profiles")
                .select("id, full_name, city, is_blocked")
                .eq("auth_user_id", user.id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ] as const);

        if (postsError) throw postsError;
        if (profilesError) throw profilesError;

        setPosts(postsData ?? []);
        const allProfiles = (profilesData ?? []) as Profile[];
        setProfiles(allProfiles);

        // Суммарный стаж по одной и той же профессии (role_title) с учётом разных отраслей/подотраслей.
        // Берём base из profiles.experience_years и дополняем из public.profile_work.
        const expMap = new Map<string, number>();
        const addExp = (
          profileId: string,
          roleTitle: string | null | undefined,
          exp: number | null | undefined,
        ) => {
          if (!profileId || !roleTitle) return;
          if (exp == null) return;
          const key = `${profileId}::${roleTitle}`;
          expMap.set(key, (expMap.get(key) ?? 0) + exp);
        };

        // Считаем стаж ТОЛЬКО один раз по профилям (profilesData),
        // а затем дополняем его из profile_work.
        const profileIds = new Set<string>();
        for (const p of allProfiles) {
          profileIds.add(p.id);
          addExp(p.id, p.role_title, p.experience_years);
        }

        if (profileIds.size > 0) {
          try {
            const { data: workRows, error: workErr } = await supabase
              .from("profile_work")
              .select("profile_id, role_title, experience_years")
              .in("profile_id", Array.from(profileIds));
            if (workErr) throw workErr;

            for (const row of workRows ?? []) {
              const r = row as any;
              addExp(r.profile_id, r.role_title, r.experience_years);
            }
          } catch {
            // в случае ошибок оставляем базовую сумму из profiles/posts
          }
        }

        const expObj: Record<string, number> = {};
        for (const [k, v] of expMap.entries()) expObj[k] = v;
        setExperienceSumByKey(expObj);

        if (user && !currentProfileResult.error && currentProfileResult.data) {
          const p = currentProfileResult.data as {
            id: string;
            full_name: string | null;
            city: string | null;
            is_blocked: boolean | null;
          };
          setCurrentUser({
            profileId: p.id,
            fullName: p.full_name,
            city: p.city,
            isBlocked: !!p.is_blocked,
          });

          // загружаем только те профили, с кем у текущего пользователя есть чаты
          const { data: memberRows, error: memberErr } = await supabase
            .from("chat_members")
            .select("chat_id")
            .eq("user_id", p.id);

          if (!memberErr && memberRows && memberRows.length > 0) {
            const chatIds = Array.from(
              new Set(memberRows.map((m: any) => m.chat_id as string)),
            );

            const { data: otherRows, error: otherErr } = await supabase
              .from("chat_members")
              .select(
                "chat_id, user_id, profiles(id, full_name, city, industry, subindustry, role_title, last_seen_at, skills, resources, rating_avg, rating_count)",
              )
              .in("chat_id", chatIds)
              .neq("user_id", p.id);

            if (!otherErr && otherRows) {
              const map = new Map<string, { chatId: string; profile: Profile }>();
              (otherRows as any[]).forEach((row) => {
                const prof = row.profiles as any;
                if (!prof) return;
                map.set(prof.id as string, {
                  chatId: row.chat_id as string,
                  profile: {
                    id: prof.id,
                    full_name: prof.full_name,
                    city: prof.city,
                    industry: prof.industry,
                    subindustry: prof.subindustry,
                    role_title: prof.role_title,
                    last_seen_at: prof.last_seen_at ?? null,
                    skills: prof.skills ?? null,
                    resources: prof.resources ?? null,
                    rating_avg: prof.rating_avg,
                    rating_count: prof.rating_count,
                  },
                });
              });

              const baseItems: ChatListItem[] = Array.from(map.values()).map(
                (v) => ({
                  chatId: v.chatId,
                  profile: v.profile,
                  lastMessageAt: null,
                }),
              );

              // подтягиваем время последнего сообщения для сортировки
              const lastByChat = new Map<string, string>();
              await Promise.all(
                Array.from(new Set(baseItems.map((i) => i.chatId))).map(
                  async (chatId) => {
                    const { data: msg } = await supabase
                      .from("messages")
                      .select("created_at")
                      .eq("chat_id", chatId)
                      .order("created_at", { ascending: false })
                      .limit(1)
                      .maybeSingle();
                    if (msg?.created_at) lastByChat.set(chatId, msg.created_at);
                  },
                ),
              );

              const withLast = baseItems
                .map((i) => ({
                  ...i,
                  lastMessageAt: lastByChat.get(i.chatId) ?? null,
                }))
                .sort((a, b) => {
                  const at = a.lastMessageAt ?? "";
                  const bt = b.lastMessageAt ?? "";
                  return bt.localeCompare(at);
                });

              setChatList(withLast);
            } else {
              setChatList([]);
            }
          } else {
            setChatList([]);
          }
        } else {
          setCurrentUser(null);
          setChatList([]);
        }

      } catch (err: any) {
        setError(err.message ?? "Не удалось загрузить данные");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // Автооткрытие чата, если пришли с параметром ?chat=profileId
  useEffect(() => {
    if (!currentUser || !profiles.length) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const chatProfileId = params.get("chat");
    if (!chatProfileId) return;
    const p = profiles.find((pr) => pr.id === chatProfileId);
    if (p) {
      openChatWithProfile(p);
    }
  }, [currentUser, profiles]);

  // Периодически подтягиваем новые сообщения для общего чата,
  // чтобы поведение было ближе к мессенджеру.
  useEffect(() => {
    const interval = setInterval(async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(
          "id, body, city, created_at, author_id, author:profiles(full_name, role_title, last_seen_at, current_status, industry, subindustry)",
        )
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        setPosts(data as Post[]);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Реальное время для личных сообщений
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const msg = payload.new as ChatMessage & { chat_id: string };

          // Игнорируем свои же сообщения (мы их уже добавили локально)
          if (msg.sender_id === currentUser.profileId) return;

          try {
            // Проверяем, что текущий пользователь участник этого чата
            const { data: members, error } = await supabase
              .from("chat_members")
              .select("user_id")
              .eq("chat_id", (msg as any).chat_id);

            if (error || !members) return;

            const memberIds = members.map((m) => m.user_id as string);
            if (!memberIds.includes(currentUser.profileId)) return;

            const otherId =
              memberIds.find((id) => id !== currentUser.profileId) ??
              currentUser.profileId;

            // Если этот чат сейчас открыт — просто добавляем сообщение в окно
            if (activeChatId === (msg as any).chat_id) {
              setChatMessages((prev) => [...prev, msg]);
            } else {
              // Иначе увеличиваем счётчик непрочитанных для собеседника
              setUnreadByUser((prev) => ({
                ...prev,
                [otherId]: (prev[otherId] || 0) + 1,
              }));
            }

            // Поднимаем чат вверх в списке и обновляем lastMessageAt
            setChatList((prev) => {
              const chatId = (msg as any).chat_id as string;
              const idx = prev.findIndex((x) => x.chatId === chatId);
              if (idx < 0) return prev;
              const next = [...prev];
              const item = { ...next[idx], lastMessageAt: msg.created_at };
              next.splice(idx, 1);
              return [item, ...next];
            });
          } catch {
            // тихо игнорируем ошибки realtime-обработчика
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, activeChatId]);

  const visiblePosts = useMemo(() => {
    const normalizedAuthor = (a: any) => (Array.isArray(a) ? a[0] : a);

    return posts.filter((post) => {
      const a = normalizedAuthor(post.author);
      if (!a) return true;

      if (feedFilters.profession) {
        if ((a.role_title ?? null) !== feedFilters.profession) return false;
      }
      if (feedFilters.industry) {
        if ((a.industry ?? null) !== feedFilters.industry) return false;
      }
      if (feedFilters.subindustry) {
        if ((a.subindustry ?? null) !== feedFilters.subindustry) return false;
      }
      if (feedFilters.current_status) {
        if ((a.current_status ?? null) !== feedFilters.current_status)
          return false;
      }
      return true;
    });
  }, [posts, feedFilters]);

  const [professionCatalog, setProfessionCatalog] = useState<ProfessionCatalogRow[]>(
    [],
  );
  const [industryCatalog, setIndustryCatalog] = useState<IndustryCatalogRow[]>([]);
  const [subindustryCatalog, setSubindustryCatalog] = useState<
    SubindustryCatalogRow[]
  >([]);

  useEffect(() => {
    let alive = true;
    loadProfessionCatalog()
      .then((rows) => {
        if (!alive) return;
        setProfessionCatalog(rows);
      })
      .catch(() => {
        // best-effort: keep UI functional even if catalog table isn't set up yet
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    loadIndustryCatalog()
      .then((rows) => {
        if (!alive) return;
        setIndustryCatalog(rows);
      })
      .catch((e) => {
        console.error("Failed to load industry_catalog", e);
      });
    loadSubindustryCatalog()
      .then((rows) => {
        if (!alive) return;
        setSubindustryCatalog(rows);
      })
      .catch((e) => {
        console.error("Failed to load subindustry_catalog", e);
      });
    return () => {
      alive = false;
    };
  }, []);

  const selectedProfessionRow = useMemo(() => {
    if (!feedFilters.profession) return null;
    return (
      professionCatalog.find((p) => p.label === feedFilters.profession) ?? null
    );
  }, [feedFilters.profession, professionCatalog]);


  const subindustryOptionsForFilters = useMemo(() => {
    const ind = feedFilters.industry ?? null;
    if (!ind) return [];
    if (industryCatalog.length > 0) {
      return getSubindustryLabelsForSelect(subindustryCatalog, ind).filter(
        (x) => x !== "Другое",
      );
    }
    return (SUBINDUSTRY_OPTIONS[ind as Industry] ?? []).slice().sort(sortRuAsc);
  }, [feedFilters.industry, industryCatalog.length, subindustryCatalog]);

  const filteredProfilesForMap = useMemo(() => {
    return profiles.filter((p) => {
      if (contactsOnlyMode) {
        if (!contactProfileIds.includes(p.id)) return false;
      }
      if (feedFilters.profession) {
        if ((p.role_title ?? null) !== feedFilters.profession) return false;
      }
      if (feedFilters.industry) {
        if ((p.industry ?? null) !== feedFilters.industry) return false;
      }
      if (feedFilters.subindustry) {
        if ((p.subindustry ?? null) !== feedFilters.subindustry) return false;
      }
      if (feedFilters.current_status) {
        if ((p.current_status ?? null) !== feedFilters.current_status)
          return false;
      }
      return true;
    });
  }, [profiles, feedFilters, contactsOnlyMode, contactProfileIds]);

  const filteredChatList = useMemo(() => {
    if (!contactsOnlyMode) return chatList;
    return chatList.filter((item) => contactProfileIds.includes(item.profile.id));
  }, [chatList, contactsOnlyMode, contactProfileIds]);

  const resetContactsMode = () => {
    if (typeof window === "undefined") return;
    // Update UI immediately; URL listener will confirm via next event.
    setContactsOnlyMode(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("contacts");
    window.history.replaceState({}, "", url.toString());
    window.dispatchEvent(new Event("locationchange"));
  };

  const toggleContact = async (profileId: string) => {
    if (!currentUser?.profileId) return;
    if (profileId === currentUser.profileId) return;

    const isIn = contactProfileIds.includes(profileId);
    setContactProfileIds((prev) =>
      isIn ? prev.filter((x) => x !== profileId) : [...prev, profileId],
    );

    try {
      if (isIn) {
        const { error } = await supabase
          .from("profile_contacts")
          .delete()
          .eq("owner_id", currentUser.profileId)
          .eq("contact_profile_id", profileId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("profile_contacts").insert({
          owner_id: currentUser.profileId,
          contact_profile_id: profileId,
        });
        if (error) throw error;
      }
    } catch (e) {
      console.error("Failed to toggle contact", e);
      setContactProfileIds((prev) =>
        isIn ? [...prev, profileId] : prev.filter((x) => x !== profileId),
      );
    }
  };

  // Закрытие поп-апа фильтров по клику вне и по Esc
  useEffect(() => {
    if (!feedFiltersOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (!feedFiltersRef.current) return;
      if (!feedFiltersRef.current.contains(event.target as Node)) {
        setFeedFiltersOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFeedFiltersOpen(false);
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [feedFiltersOpen]);

  const handleTogglePost = (id: string) => {
    setExpandedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    }).format(d);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setCreateError("Нужно войти, чтобы написать пост.");
      return;
    }
    if (currentUser.isBlocked) {
      setCreateError("Ваш аккаунт заблокирован. Публикация недоступна.");
      return;
    }
    if (!newPostBody.trim()) {
      setCreateError("Напишите текст сообщения.");
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const maskedBody = maskProfanity(newPostBody.trim()) ?? "";
      const body = maskedBody.slice(0, 1000);
      const { data, error } = await supabase
        .from("posts")
        .insert({
          author_id: currentUser.profileId,
          title: "Общий чат",
          body,
          city: currentUser.city,
        })
        .select(
          "id, body, city, created_at, author_id, author:profiles(full_name, role_title, last_seen_at, current_status, industry, subindustry)",
        )
        .single();

      if (error) throw error;

      setPosts((prev) => {
        const next = [data as Post, ...prev];
        return next.slice(0, 20);
      });
      setNewPostBody("");
    } catch (err: any) {
      setCreateError(err.message ?? "Не удалось отправить сообщение.");
    } finally {
      setCreating(false);
    }
  };

  const openChatWithProfile = async (profile: Profile) => {
    if (!currentUser) {
      setChatError("Нужно войти, чтобы отправлять сообщения.");
      return;
    }

    setActiveChatUser(profile);
    setChatError(null);
    setChatLoading(true);

    try {
      // Ищем существующий личный чат с этим пользователем
      const { data: chatsData, error: chatsError } = await supabase
        .from("chats")
        .select("id, is_group, chat_members(user_id)")
        .eq("is_group", false);

      if (chatsError) throw chatsError;

      let chatId: string | null = null;

      if (chatsData) {
        for (const chat of chatsData as any[]) {
          const members = chat.chat_members as { user_id: string }[];
          const memberIds = members.map((m) => m.user_id);
          if (
            memberIds.includes(currentUser.profileId) &&
            memberIds.includes(profile.id)
          ) {
            chatId = chat.id as string;
            break;
          }
        }
      }

      // Если чата нет — создаём
      if (!chatId) {
        const { data: newChat, error: createChatError } = await supabase
          .from("chats")
          .insert({
            is_group: false,
            title: null,
            created_by: currentUser.profileId,
          })
          .select("id")
          .single();

        if (createChatError) throw createChatError;

        chatId = (newChat as any).id as string;

        const { error: membersError } = await supabase
          .from("chat_members")
          .insert([
            { chat_id: chatId, user_id: currentUser.profileId },
            { chat_id: chatId, user_id: profile.id },
          ]);

        if (membersError) throw membersError;
      }

      setActiveChatId(chatId);

      // Загружаем последние 5 сообщений
      const { data: msgsData, error: msgsError } = await supabase
        .from("messages")
        .select("id, content, sender_id, created_at")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (msgsError) throw msgsError;

      const normalized = (msgsData ?? []).reverse() as ChatMessage[];
      setChatMessages(normalized);
      setUnreadByUser((prev) => ({ ...prev, [profile.id]: 0 }));
    } catch (err: any) {
      setChatError(err.message ?? "Не удалось открыть диалог.");
    } finally {
      setChatLoading(false);
    }
  };

  const openChatFromList = async (item: ChatListItem) => {
    await openChatWithProfile(item.profile);
    setUnreadByUser((prev) => ({ ...prev, [item.profile.id]: 0 }));
    setChatList((prev) => {
      const idx = prev.findIndex((x) => x.chatId === item.chatId);
      if (idx < 0) return prev;
      const next = [...prev];
      const moved = next[idx];
      next.splice(idx, 1);
      return [moved, ...next];
    });
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !activeChatId || !chatInput.trim()) return;
    if (currentUser.isBlocked) {
      setChatError("Ваш аккаунт заблокирован. Отправка сообщений недоступна.");
      return;
    }

    setChatSending(true);
    setChatError(null);

    try {
      // Personal messages: do not mask profanity (per product rule)
      const content = chatInput.trim().slice(0, 1000);

      const { data, error } = await supabase
        .from("messages")
        .insert({
          chat_id: activeChatId,
          sender_id: currentUser.profileId,
          content,
        })
        .select("id, content, sender_id, created_at")
        .single();

      if (error) throw error;

      setChatMessages((prev) => [...prev, data as ChatMessage]);
      setChatInput("");

      // Поднимаем чат вверх в списке по отправке
      setChatList((prev) => {
        if (!activeChatId) return prev;
        const idx = prev.findIndex((x) => x.chatId === activeChatId);
        if (idx < 0) return prev;
        const next = [...prev];
        const item = { ...next[idx], lastMessageAt: (data as any).created_at };
        next.splice(idx, 1);
        return [item, ...next];
      });
    } catch (err: any) {
      setChatError(err.message ?? "Не удалось отправить сообщение.");
    } finally {
      setChatSending(false);
    }
  };

  // автоскролл к последнему сообщению при изменении списка
  useEffect(() => {
    if (!activeChatUser) return;
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chatMessages, activeChatUser]);

  // закрытие окна чата по клику вне и по Esc
  useEffect(() => {
    if (!activeChatUser) return;

    const handleClick = (event: MouseEvent) => {
      if (!chatWindowRef.current) return;
      if (!chatWindowRef.current.contains(event.target as Node)) {
        setActiveChatUser(null);
        setActiveChatId(null);
        setChatMessages([]);
        setChatError(null);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveChatUser(null);
        setActiveChatId(null);
        setChatMessages([]);
        setChatError(null);
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [activeChatUser]);

  // закрытие карточки профиля (из общего чата) по клику вне и Esc
  useEffect(() => {
    if (!activeProfileCard) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.("[data-profile-card]")) return;
      setActiveProfileCard(null);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveProfileCard(null);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [activeProfileCard]);

  // Закрытие меню выбора города по клику вне и по Esc
  useEffect(() => {
    if (!cityMenuOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (!cityMenuRef.current) return;
      if (!cityMenuRef.current.contains(event.target as Node)) {
        setCityMenuOpen(false);
        setCitySearch("");
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCityMenuOpen(false);
        setCitySearch("");
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [cityMenuOpen]);

  const visibleCities = SORTED_CITY_OPTIONS.filter((city) =>
    city.toLowerCase().includes(citySearch.toLowerCase()),
  );

  const currentCityKey = selectedCity || "Пермь";
  const mapConfig = CITY_VIEWS[currentCityKey] ?? CITY_VIEWS["Пермь"];

  return (
    <div className="flex h-[calc(100vh-3rem)] bg-slate-50">
      <main className="flex h-full w-full flex-col gap-4 py-3 md:flex-row md:gap-3 lg:gap-4">
        {/* Левая колонка: лента запросов, как список чата */}
        <section className="flex h-full w-full flex-col rounded-2xl bg-white p-4 shadow-sm md:w-[320px] md:flex-shrink-0 md:p-5">
          <header className="relative mb-3 flex items-center justify-between gap-2">
            <h1 className="text-base font-semibold text-slate-900">
              Общий чат
            </h1>
          </header>

          {loading && <p className="text-sm text-slate-500">Загрузка...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!loading && posts.length === 0 && (
            <p className="text-sm text-slate-500">
              Пока нет запросов. Создай первый пост позже — мы добавим форму.
            </p>
          )}

          {/* Список постов с прокруткой */}
          <div className="mb-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            <ul className="space-y-2">
              {visiblePosts.map((post) => {
                const isExpanded = expandedPosts.has(post.id);
                const body = post.body || "";
                const shouldTruncate = body.length > 200;
                const text = isExpanded
                  ? body
                  : shouldTruncate
                  ? body.slice(0, 200) + "…"
                  : body;

                const authorObj = Array.isArray(post.author)
                  ? post.author[0]
                  : post.author;
                const authorName = authorObj?.full_name || "Аноним";
                const authorOnline = isOnline(authorObj?.last_seen_at ?? null);
                const prof = (authorObj?.role_title as string | null) ?? null;
                const totalExpYears = getTotalExperienceYears(post.author_id, prof);

                return (
                  <li
                    key={post.id}
                    className="cursor-pointer rounded-2xl border border-slate-100 bg-slate-50/70 p-3 transition hover:border-sky-100 hover:bg-sky-50/40"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const p = profiles.find(
                            (pr) => pr.id === post.author_id,
                          );
                          if (p) {
                            const rect = (
                              e.currentTarget as HTMLElement
                            ).getBoundingClientRect();
                            const top = rect.top + window.scrollY;
                            setActiveProfileCard({ profile: p, top });
                          }
                        }}
                        className="text-left text-sm font-semibold text-slate-900 hover:text-sky-700"
                      >
                        <span className="inline-flex items-center gap-2">
                          <span>{authorName}</span>
                          <span
                            className={`h-2 w-2 rounded-full ${
                              authorOnline ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                            title={authorOnline ? "Онлайн" : "Оффлайн"}
                          />
                        </span>
                        {prof ? (
                          <span className="ml-1 text-xs font-normal text-slate-500">
                            — {prof}
                          </span>
                        ) : null}
                      </button>
                    </div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {post.created_at ? formatDateTime(post.created_at) : ""}
                      </span>
                    </div>
                    {body && (
                      <p className="text-xs text-slate-600">{text}</p>
                    )}
                    {shouldTruncate && (
                      <button
                        type="button"
                        onClick={() => handleTogglePost(post.id)}
                        className="mt-1 text-[11px] font-medium text-sky-700 hover:underline"
                      >
                        {isExpanded ? "Свернуть" : "Читать далее"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Форма нового сообщения */}
          <form onSubmit={handleCreatePost} className="space-y-2">
            <textarea
              value={newPostBody}
              onChange={(e) =>
                setNewPostBody(e.target.value.slice(0, 1000))
              }
              rows={3}
              placeholder={
                currentUser
                  ? "Напиши, кого или что ты ищешь…"
                  : "Войди, чтобы написать сообщение…"
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!creating && newPostBody.trim()) {
                    handleCreatePost(e as any);
                  }
                }
              }}
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {newPostBody.length}/1000
              </span>
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-sky-700 disabled:opacity-60"
              >
                {creating ? "Отправляем..." : "Отправить"}
              </button>
            </div>
            {createError && (
              <p className="text-[11px] text-red-600">{createError}</p>
            )}
          </form>

          {activeProfileCard && (
            <div
              data-profile-card
              className="fixed z-[1300] w-[260px] rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-xl"
              style={{
                top: activeProfileCard.top,
                left: activeProfileCard.left ?? 340,
              }}
            >
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>
                        {activeProfileCard.profile.full_name || "Пользователь"}
                      </span>
                      {activeProfileCard.profile.role_title ? (
                        <span>{activeProfileCard.profile.role_title}</span>
                      ) : null}
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isOnline(activeProfileCard.profile.last_seen_at ?? null)
                            ? "bg-emerald-500"
                            : "bg-slate-400"
                        }`}
                        title={
                          isOnline(activeProfileCard.profile.last_seen_at ?? null)
                            ? "Онлайн"
                            : "Оффлайн"
                        }
                      />
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {activeProfileCard.profile.city || "Город не указан"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveProfileCard(null)}
                  className="ml-2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
              <p className="text-[11px] text-slate-600">
                <span className="font-medium text-slate-700">Отрасль:</span>{" "}
                {activeProfileCard.profile.industry || "Не указана"}
              </p>
              <p className="text-[11px] text-slate-600">
                <span className="font-medium text-slate-700">Подотрасль:</span>{" "}
                {activeProfileCard.profile.subindustry || "Не указана"}
              </p>

              <p className="text-[11px] text-slate-600 whitespace-pre-line">
                <span className="block font-medium text-slate-700">О себе:</span>{" "}
                {activeProfileCard.profile.skills
                  ? activeProfileCard.profile.skills.slice(0, 220) +
                    (activeProfileCard.profile.skills.length > 220 ? "…" : "")
                  : "Не указано"}
              </p>

              <p className="text-[11px] text-slate-600 whitespace-pre-line">
                <span className="block font-medium text-slate-700">Ресурсы:</span>{" "}
                {activeProfileCard.profile.resources
                  ? activeProfileCard.profile.resources.slice(0, 220) +
                    (activeProfileCard.profile.resources.length > 220 ? "…" : "")
                  : "Не указано"}
              </p>
              <div className="mt-2 flex gap-2">
                <a
                  href={`/profiles/${activeProfileCard.profile.id}`}
                  className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  Профиль
                </a>
                <button
                  type="button"
                  onClick={() => {
                    openChatWithProfile(activeProfileCard.profile);
                    setActiveProfileCard(null);
                  }}
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-sky-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-sky-700"
                >
                  Написать
                </button>
                {currentUser?.profileId &&
                currentUser.profileId !== activeProfileCard.profile.id ? (
                  <button
                    type="button"
                    onClick={() => toggleContact(activeProfileCard.profile.id)}
                    className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {contactProfileIds.includes(activeProfileCard.profile.id)
                      ? "Удалить"
                      : "Добавить в контакты"}
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </section>

        {/* Центр: карта во всю высоту */}
        <section className="order-last flex h-full flex-1 flex-col md:order-none md:px-1 lg:px-2">
          <div className="relative z-[1100] mb-3 flex items-center justify-between gap-2">
            <div className="relative flex items-center gap-2" ref={feedFiltersRef}>
              <button
                type="button"
                onClick={() => setFeedFiltersOpen((v) => !v)}
                className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:border-sky-300 hover:text-sky-700"
                aria-label="Настройки поиска"
                title="Настройки"
              >
                <img
                  src="/Icons/Sliders.svg"
                  alt="Настройки"
                  className="h-4 w-4"
                />
              </button>
              <h2 className="text-sm font-semibold text-slate-900">
                Специалисты на карте
              </h2>

              {feedFiltersOpen && (
                <div
                  className="pointer-events-auto absolute left-0 top-10 z-[1200] w-[300px] rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-xl"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">
                      Поиск по специалистам
                    </p>
                    <button
                      type="button"
                      onClick={() => setFeedFiltersOpen(false)}
                      className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Закрыть"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">
                        Профессия
                      </label>
                      <DropdownSelect
                        value={feedFilters.profession}
                        placeholder="Любая"
                        options={[
                          { value: "", label: "Любая" },
                          ...getProfessionLabelsForSelect(professionCatalog).map(
                            (label) => ({
                              value: label,
                              label,
                            }),
                          ),
                        ]}
                        onChange={(v) => {
                          const next: FeedFilters = {
                            ...feedFilters,
                            profession: v || null,
                          };
                          setFeedFilters(next);
                          if (typeof window !== "undefined") {
                            window.localStorage.setItem(
                              "feed_filters",
                              JSON.stringify(next),
                            );
                          }
                        }}
                        menuClassName="text-[11px]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">
                        Отрасль
                      </label>
                      <DropdownSelect
                        value={feedFilters.industry}
                        placeholder="Любая"
                        options={[
                          { value: "", label: "Любая" },
                          ...(
                            industryCatalog.length > 0
                              ? getIndustryLabelsForSelect(industryCatalog)
                              : SORTED_INDUSTRY_OPTIONS
                          ).map((ind) => ({
                            value: ind,
                            label: ind,
                          })),
                        ]}
                        onChange={(v) => {
                          const next: FeedFilters = {
                            ...feedFilters,
                            industry: v || null,
                            subindustry: null,
                          };
                          setFeedFilters(next);
                          if (typeof window !== "undefined") {
                            window.localStorage.setItem(
                              "feed_filters",
                              JSON.stringify(next),
                            );
                          }
                        }}
                        menuClassName="text-[11px]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">
                        Подотрасль
                      </label>
                      <DropdownSelect
                        value={feedFilters.subindustry}
                        disabled={!feedFilters.industry}
                        placeholder={
                          feedFilters.industry ? "Любая" : "Сначала выберите отрасль"
                        }
                        options={[
                          { value: "", label: "Любая" },
                          ...subindustryOptionsForFilters.map((s) => ({
                            value: s,
                            label: s,
                          })),
                        ]}
                        onChange={(v) => {
                          const next: FeedFilters = {
                            ...feedFilters,
                            subindustry: v || null,
                          };
                          setFeedFilters(next);
                          if (typeof window !== "undefined") {
                            window.localStorage.setItem(
                              "feed_filters",
                              JSON.stringify(next),
                            );
                          }
                        }}
                        menuClassName="text-[11px]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">
                        Текущий статус
                      </label>
                      <DropdownSelect
                        value={feedFilters.current_status}
                        placeholder="Любой"
                        options={[
                          { value: "", label: "Любая" },
                          ...CURRENT_STATUS_OPTIONS.map((s) => ({
                            value: s,
                            label: s,
                          })),
                        ]}
                        onChange={(v) => {
                          const next: FeedFilters = {
                            ...feedFilters,
                            current_status: v || null,
                          };
                          setFeedFilters(next);
                          if (typeof window !== "undefined") {
                            window.localStorage.setItem(
                              "feed_filters",
                              JSON.stringify(next),
                            );
                          }
                        }}
                        menuClassName="text-[11px]"
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setFeedFilters(DEFAULT_FEED_FILTERS);
                          if (typeof window !== "undefined") {
                            window.localStorage.setItem(
                              "feed_filters",
                              JSON.stringify(DEFAULT_FEED_FILTERS),
                            );
                          }
                        }}
                        className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Сбросить
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeedFiltersOpen(false)}
                        className="rounded-full bg-sky-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-sky-700"
                      >
                        Поиск
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="relative w-48" ref={cityMenuRef}>
              <button
                type="button"
                onClick={() => setCityMenuOpen((v) => !v)}
                className="flex w-full items-center justify-between rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-700 shadow-sm hover:border-sky-300 hover:text-sky-800"
              >
                <span className="truncate">
                  {selectedCity ? selectedCity : "Выберите город"}
                </span>
                <span className="ml-2 text-[10px] text-slate-400">
                  {cityMenuOpen ? "▲" : "▼"}
                </span>
              </button>

              {cityMenuOpen && (
                <div className="absolute right-0 top-9 z-[1200] w-56 rounded-xl border border-slate-200 bg-white py-1 text-xs shadow-lg">
                  <div className="px-2 pb-1">
                    <input
                      autoFocus
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                      placeholder="Найти город"
                      className="h-7 w-full rounded-full border border-slate-200 px-2 text-[11px] text-slate-700 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                    />
                  </div>
                  <div className="max-h-[560px] overflow-y-auto px-1 pb-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCity(RUSSIA_LABEL);
                        if (typeof window !== "undefined") {
                          window.localStorage.setItem(
                            "selected_city",
                            RUSSIA_LABEL,
                          );
                        }
                        setCityMenuOpen(false);
                        setCitySearch("");
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-[11px] font-medium text-slate-800 hover:bg-slate-50"
                    >
                      <span>{RUSSIA_LABEL}</span>
                    </button>
                    <div className="my-1 h-px bg-slate-100" />
                    {visibleCities.length === 0 ? (
                      <p className="px-2 py-1 text-[11px] text-slate-400">
                        Ничего не найдено
                      </p>
                    ) : (
                      visibleCities.map((city) => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => {
                            setSelectedCity(city);
                            if (typeof window !== "undefined") {
                              window.localStorage.setItem(
                                "selected_city",
                                city,
                              );
                            }
                            setCityMenuOpen(false);
                            setCitySearch("");
                          }}
                          className="flex w-full items-center rounded-lg px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-slate-50"
                        >
                          {city}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div ref={mapContainerRef} className="min-h-0 flex-1">
            <PartnerMap
              profiles={filteredProfilesForMap}
              contactProfileIds={contactProfileIds}
              center={mapConfig.center}
              zoom={mapConfig.zoom}
              onOpenChat={(profileId) => {
                const p = profiles.find((pr) => pr.id === profileId);
                if (p) {
                  openChatWithProfile(p);
                }
              }}
              onToggleContact={(profileId) => {
                toggleContact(profileId);
              }}
            />
          </div>
        </section>

        {/* Правая колонка: список чатов / специалистов */}
        <aside className="flex h-full w-full flex-col rounded-2xl bg-white p-4 shadow-sm md:w-[260px] md:flex-shrink-0 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              {contactsOnlyMode ? "Контакты" : "Мои чаты"}
            </h2>
            {contactsOnlyMode ? (
              <button
                type="button"
                onClick={resetContactsMode}
                className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 hover:text-sky-700"
              >
                Сбросить
              </button>
            ) : null}
          </div>

          {!loading && filteredChatList.length === 0 && (
            <p className="text-sm text-slate-500">
              {contactsOnlyMode
                ? "У вас пока нет личных диалогов с контактами. Добавьте контакт или начните переписку."
                : "У вас пока нет личных диалогов. Начните переписку, чтобы чат появился в списке."}
            </p>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <ul className="space-y-2">
              {filteredChatList.map((item) => (
                <li
                  key={item.profile.id}
                  onClick={() => openChatFromList(item)}
                  className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2 transition hover:border-sky-200 hover:bg-sky-50/60"
                >
                  <div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const top = rect.top + window.scrollY;
                      const popupWidth = 260;
                      const gap = 8;
                      const mapRect = mapContainerRef.current?.getBoundingClientRect();
                      const left = mapRect
                        ? Math.max(8, mapRect.right - popupWidth - gap)
                        : 340;
                      setActiveProfileCard({ profile: item.profile, top, left });
                      }}
                      className="text-left text-sm font-medium text-slate-900 hover:text-sky-700"
                    >
                      <span className="inline-flex items-center gap-2">
                        <span>{item.profile.full_name || "Без имени"}</span>
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isOnline(item.profile.last_seen_at ?? null)
                              ? "bg-emerald-500"
                              : "bg-slate-400"
                          }`}
                          title={
                            isOnline(item.profile.last_seen_at ?? null)
                              ? "Онлайн"
                              : "Оффлайн"
                          }
                        />
                      </span>
                    </button>
                    <p className="text-xs text-slate-500">
                      {item.profile.role_title || "Профессия не указана"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {item.profile.city || "Город не указан"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {(() => {
                      const unread = unreadByUser[item.profile.id] ?? 0;
                      if (unread <= 0) return null;
                      return (
                      <span className="inline-flex min-w-[18px] justify-center rounded-full bg-sky-600 px-1 text-[10px] font-semibold text-white">
                          +{unread}
                      </span>
                      );
                    })()}
                    {item.profile.rating_count != null ? (
                      <span className="text-xs font-medium text-slate-600">
                        Рейтинг {item.profile.rating_count}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Окно диалога поверх карты и списка чатов */}
        {activeChatUser && (
          <div
            ref={chatWindowRef}
            className="pointer-events-auto fixed top-16 right-3 z-[1600] flex h-[380px] w-full max-w-sm flex-col rounded-2xl border border-slate-200 bg-white shadow-xl md:right-[280px]"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
              <div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    const rect = (
                      e.currentTarget as HTMLElement
                    ).getBoundingClientRect();
                    const top = rect.top + window.scrollY;
                  const popupWidth = 260;
                  const gap = 8;
                  const mapRect = mapContainerRef.current?.getBoundingClientRect();
                  const left = mapRect
                    ? Math.max(8, mapRect.right - popupWidth - gap)
                    : 340;
                  setActiveProfileCard({ profile: activeChatUser, top, left });
                  }}
                  className="text-sm font-semibold text-slate-900 hover:text-sky-700"
                >
                  <span className="inline-flex items-center gap-2">
                    <span>{activeChatUser.full_name || "Без имени"}</span>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isOnline(activeChatUser.last_seen_at ?? null)
                          ? "bg-emerald-500"
                          : "bg-slate-400"
                      }`}
                      title={
                        isOnline(activeChatUser.last_seen_at ?? null)
                          ? "Онлайн"
                          : "Оффлайн"
                      }
                    />
                  </span>
                </button>
                <p className="text-[11px] text-slate-500">
                  {activeChatUser.role_title ||
                    activeChatUser.city ||
                    "Профессия не указана"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveChatUser(null);
                  setActiveChatId(null);
                  setChatMessages([]);
                  setChatError(null);
                }}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden px-3 py-2">
              <div
                ref={chatScrollRef}
                className="mb-2 flex-1 overflow-y-auto space-y-2"
              >
                {chatLoading ? (
                  <p className="text-xs text-slate-500">
                    Загружаем сообщения...
                  </p>
                ) : (
                  <>
                    {chatMessages.map((m) => (
                      <div
                        key={m.id}
                        className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-xs ${
                          m.sender_id === currentUser?.profileId
                            ? "ml-auto bg-sky-600 text-white"
                            : "mr-auto bg-slate-50/70 text-slate-900"
                        }`}
                      >
                        <p>{m.content}</p>
                        <p
                          className={`mt-1 text-[10px] ${
                            m.sender_id === currentUser?.profileId
                              ? "text-white/80"
                              : "text-slate-400"
                          }`}
                        >
                          {m.created_at ? formatDateTime(m.created_at) : ""}
                        </p>
                      </div>
                    ))}
                    {chatMessages.length === 0 && !chatLoading && (
                      <p className="text-xs text-slate-400">
                        Пока нет сообщений. Напишите что‑нибудь первым.
                      </p>
                    )}
                  </>
                )}
              </div>

              {chatError && (
                <p className="mb-1 text-[11px] text-red-600">{chatError}</p>
              )}

              <form
                onSubmit={handleSendChatMessage}
                className="mt-1 space-y-1 border-t border-slate-200 pt-2"
              >
                <textarea
                  value={chatInput}
                  onChange={(e) =>
                    setChatInput(e.target.value.slice(0, 1000))
                  }
                  rows={4}
                  placeholder="Напишите сообщение…"
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!chatSending && chatInput.trim()) {
                        handleSendChatMessage(e as any);
                      }
                    }
                  }}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    {chatInput.length}/1000
                  </span>
                  <button
                    type="submit"
                    disabled={chatSending || !chatInput.trim()}
                    className="inline-flex items-center rounded-lg bg-sky-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-sky-700 disabled:opacity-60"
                  >
                    {chatSending ? "Отправляем..." : "Отправить"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
