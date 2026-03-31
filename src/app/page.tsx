"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { MainMobileNav, type MobileMainTab } from "@/components/MainMobileNav";
import { ProfilePreviewCard } from "@/components/ProfilePreviewCard";
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
import { notifyProfileContactsChanged } from "@/lib/contactEvents";
import { useSelectedCity } from "@/contexts/SelectedCityContext";
import { getMapConfigForCity } from "@/data/cityMapViews";
import type { PostCommentRow } from "@/components/PostComments";

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

export type Profile = {
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
  /** Текст последнего сообщения в чате (для превью в списке) */
  lastMessagePreview: string | null;
};

function formatChatListPreview(content: string | null | undefined): string | null {
  const s = (content ?? "").replace(/\s+/g, " ").trim();
  if (!s) return null;
  return s.length > 30 ? `${s.slice(0, 30)}...` : s;
}

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

function groupCommentsByPostId(
  rows: PostCommentRow[],
): Record<string, PostCommentRow[]> {
  const byPost: Record<string, PostCommentRow[]> = {};
  for (const row of rows) {
    const pid = row.post_id;
    if (!byPost[pid]) byPost[pid] = [];
    byPost[pid].push(row);
  }
  return byPost;
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

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [commentsByPostId, setCommentsByPostId] = useState<
    Record<string, PostCommentRow[]>
  >({});
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
  const hasActiveFeedFilters = Boolean(
    feedFilters.profession ||
      feedFilters.industry ||
      feedFilters.subindustry ||
      feedFilters.current_status,
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
  const feedScrollRef = useRef<HTMLDivElement | null>(null);
  const [activeProfileOverlay, setActiveProfileOverlay] =
    useState<Profile | null>(null);
  const feedFiltersRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [contactProfileIds, setContactProfileIds] = useState<string[]>([]);
  const [viewedProfileIds, setViewedProfileIds] = useState<string[]>([]);
  const [blockedProfileIds, setBlockedProfileIds] = useState<string[]>([]);
  const [blockBusyByProfileId, setBlockBusyByProfileId] = useState<
    Record<string, boolean>
  >({});
  const [contactsOnlyMode, setContactsOnlyMode] = useState(false);
  const [mapContactsOnly, setMapContactsOnly] = useState(false);
  const router = useRouter();
  const [mobileTab, setMobileTab] = useState<MobileMainTab>("map");
  const { selectedCity } = useSelectedCity();
  const mapConfig = useMemo(
    () => getMapConfigForCity(selectedCity),
    [selectedCity],
  );

  const timeZone = useMemo(() => {
    const tzFromProfileCity = getTimeZoneByCity(currentUser?.city);
    return tzFromProfileCity ?? getBrowserTimeZone() ?? "Europe/Moscow";
  }, [currentUser?.city]);

  // режим "Контакты" включаем через query-param ?contacts=1
  // (Next router меняет URL через history.pushState, поэтому слушаем изменения location.search)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const read = () => {
      const params = new URLSearchParams(window.location.search);
      setContactsOnlyMode(params.get("contacts") === "1");
      setMapContactsOnly(params.get("mapContacts") === "1");
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

  useEffect(() => {
    if (contactsOnlyMode) setMobileTab("contacts");
  }, [contactsOnlyMode]);

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

  // загрузка просмотренных профилей текущего пользователя
  useEffect(() => {
    if (!currentUser?.profileId) {
      setViewedProfileIds([]);
      return;
    }
    let alive = true;
    supabase
      .from("profile_views")
      .select("viewed_profile_id")
      .eq("viewer_id", currentUser.profileId)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          console.error("Failed to load views", error);
          setViewedProfileIds([]);
          return;
        }
        const ids =
          (data as any[] | null)?.map((r) => r.viewed_profile_id) ?? [];
        setViewedProfileIds(ids);
      });
    return () => {
      alive = false;
    };
  }, [currentUser?.profileId]);

  // загрузка блокировок текущего пользователя
  useEffect(() => {
    if (!currentUser?.profileId) {
      setBlockedProfileIds([]);
      return;
    }
    let alive = true;
    supabase
      .from("profile_blocks")
      .select("blocked_profile_id")
      .eq("owner_id", currentUser.profileId)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          console.error("Failed to load blocks", error);
          setBlockedProfileIds([]);
          return;
        }
        const ids =
          (data as any[] | null)?.map((r) => r.blocked_profile_id) ?? [];
        setBlockedProfileIds(ids);
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
              "id, body, city, created_at, author_id, author:profiles(full_name, role_title, last_seen_at, current_status, industry, subindustry)",
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
        const postIds = (postsData ?? []).map((p: any) => p.id as string);
        if (postIds.length > 0) {
          const { data: commentsData, error: commentsErr } = await supabase
            .from("post_comments")
            .select(
              "id, post_id, author_id, body, created_at, author:profiles(full_name, role_title, last_seen_at)",
            )
            .in("post_id", postIds)
            .order("post_id", { ascending: true })
            .order("created_at", { ascending: true });
          if (commentsErr) {
            console.warn("post_comments load failed", commentsErr);
            setCommentsByPostId({});
          } else if (commentsData) {
            setCommentsByPostId(
              groupCommentsByPostId(commentsData as PostCommentRow[]),
            );
          }
        } else {
          setCommentsByPostId({});
        }
        const allProfiles = (profilesData ?? []) as Profile[];
        setProfiles(allProfiles);

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
                  lastMessagePreview: null,
                }),
              );

              const otherProfileIdByChatId = new Map<string, string>();
              baseItems.forEach((i) => otherProfileIdByChatId.set(i.chatId, i.profile.id));

              const lastByChat = new Map<
                string,
                { at: string; preview: string }
              >();
              await Promise.all(
                Array.from(new Set(baseItems.map((i) => i.chatId))).map(
                  async (chatId) => {
                    let q = supabase
                      .from("messages")
                      .select("created_at, content")
                      .eq("chat_id", chatId);

                    const otherId = otherProfileIdByChatId.get(chatId);
                    if (otherId && blockedProfileIds.includes(otherId)) {
                      q = q.neq("sender_id", otherId);
                    }

                    const { data: msg } = await q
                      .order("created_at", { ascending: false })
                      .limit(1)
                      .maybeSingle();
                    if (msg?.created_at) {
                      lastByChat.set(chatId, {
                        at: msg.created_at,
                        preview: String((msg as any).content ?? "").trim(),
                      });
                    }
                  },
                ),
              );

              const withLast = baseItems
                .map((i) => {
                  const last = lastByChat.get(i.chatId);
                  return {
                    ...i,
                    lastMessageAt: last?.at ?? null,
                    lastMessagePreview: last?.preview
                      ? last.preview
                      : null,
                  };
                })
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
        const ids = (data as Post[]).map((p) => p.id);
        if (ids.length === 0) {
          setCommentsByPostId({});
          return;
        }
        const { data: cdata, error: cerr } = await supabase
          .from("post_comments")
          .select(
            "id, post_id, author_id, body, created_at, author:profiles(full_name, role_title, last_seen_at)",
          )
          .in("post_id", ids)
          .order("post_id", { ascending: true })
          .order("created_at", { ascending: true });
        if (!cerr && cdata) {
          setCommentsByPostId(groupCommentsByPostId(cdata as PostCommentRow[]));
        }
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
          // Игнорируем сообщения от пользователей, которых мы заблокировали
          if (blockedProfileIds.includes(msg.sender_id)) return;

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

            // Поднимаем чат вверх в списке и обновляем превью
            setChatList((prev) => {
              const chatId = (msg as any).chat_id as string;
              const idx = prev.findIndex((x) => x.chatId === chatId);
              if (idx < 0) return prev;
              const next = [...prev];
              const item = {
                ...next[idx],
                lastMessageAt: msg.created_at,
                lastMessagePreview: String(msg.content ?? "").trim(),
              };
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
  }, [currentUser, activeChatId, blockedProfileIds]);

  const visiblePosts = useMemo(() => {
    const normalizedAuthor = (a: any) => (Array.isArray(a) ? a[0] : a);

    return posts
      .filter((post) => {
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
      })
      .slice()
      .sort((a, b) => {
        const ta = a.created_at ? Date.parse(a.created_at) : 0;
        const tb = b.created_at ? Date.parse(b.created_at) : 0;
        return ta - tb; // сверху старые, снизу новые
      });
  }, [posts, feedFilters]);

  useEffect(() => {
    const el = feedScrollRef.current;
    if (!el) return;
    // После отрисовки контейнера прокручиваем к последнему сообщению (низ ленты)
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [visiblePosts, loading, feedFilters]);

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
      if (contactsOnlyMode || mapContactsOnly) {
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
  }, [
    profiles,
    feedFilters,
    contactsOnlyMode,
    mapContactsOnly,
    contactProfileIds,
  ]);

  const filteredChatList = useMemo(() => {
    if (!contactsOnlyMode) return chatList;
    return chatList.filter((item) => contactProfileIds.includes(item.profile.id));
  }, [chatList, contactsOnlyMode, contactProfileIds]);

  const unreadChatsTotal = useMemo(
    () => Object.values(unreadByUser).reduce((sum, n) => sum + n, 0),
    [unreadByUser],
  );

  const resetContactsMode = () => {
    if (typeof window === "undefined") return;
    // Update UI immediately; URL listener will confirm via next event.
    setContactsOnlyMode(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("contacts");
    window.history.replaceState({}, "", url.toString());
    window.dispatchEvent(new Event("locationchange"));
  };

  const handleMobileTab = (t: MobileMainTab) => {
    setMobileTab(t);
    if (t === "contacts") {
      router.push("/?contacts=1");
      return;
    }
    if (contactsOnlyMode) resetContactsMode();
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
      notifyProfileContactsChanged();
    } catch (e) {
      console.error("Failed to toggle contact", e);
      setContactProfileIds((prev) =>
        isIn ? [...prev, profileId] : prev.filter((x) => x !== profileId),
      );
      notifyProfileContactsChanged();
    }
  };

  const toggleBlock = async (profileId: string) => {
    if (!currentUser?.profileId) return;
    if (profileId === currentUser.profileId) return;

    const isBlocked = blockedProfileIds.includes(profileId);
    setBlockedProfileIds((prev) =>
      isBlocked ? prev.filter((x) => x !== profileId) : [...prev, profileId],
    );
    setBlockBusyByProfileId((prev) => ({ ...prev, [profileId]: true }));

    // если блокируем текущего собеседника — сразу скрываем его сообщения в UI
    if (!isBlocked && activeChatUser?.id === profileId) {
      setChatMessages((prev) => prev.filter((m) => m.sender_id !== profileId));
    }

    try {
      if (isBlocked) {
        const { error } = await supabase
          .from("profile_blocks")
          .delete()
          .eq("owner_id", currentUser.profileId)
          .eq("blocked_profile_id", profileId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("profile_blocks").insert({
          owner_id: currentUser.profileId,
          blocked_profile_id: profileId,
        });
        if (error) throw error;
      }
    } catch (e) {
      console.error("Failed to toggle block", e);
      setBlockedProfileIds((prev) =>
        isBlocked ? [...prev, profileId] : prev.filter((x) => x !== profileId),
      );
    } finally {
      setBlockBusyByProfileId((prev) => ({ ...prev, [profileId]: false }));
    }
  };

  const markProfileViewed = async (profileId: string) => {
    if (!currentUser?.profileId) return;
    if (profileId === currentUser.profileId) return;
    if (viewedProfileIds.includes(profileId)) return;

    setViewedProfileIds((prev) => [...prev, profileId]);
    try {
      const { error } = await supabase.from("profile_views").insert({
        viewer_id: currentUser.profileId,
        viewed_profile_id: profileId,
      });
      if (error) throw error;
    } catch (e) {
      console.error("Failed to mark profile viewed", e);
      setViewedProfileIds((prev) => prev.filter((x) => x !== profileId));
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

  const handleSubmitComment = async (postId: string, body: string) => {
    if (!currentUser || currentUser.isBlocked) return;
    const masked = (maskProfanity(body.trim()) ?? "").slice(0, 1000);
    if (!masked) {
      throw new Error("Пустой текст.");
    }
    const { data, error } = await supabase
      .from("post_comments")
      .insert({
        post_id: postId,
        author_id: currentUser.profileId,
        body: masked,
      })
      .select(
        "id, post_id, author_id, body, created_at, author:profiles(full_name, role_title, last_seen_at)",
      )
      .single();
    if (error) throw error;
    if (data) {
      setCommentsByPostId((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] ?? []), data as PostCommentRow],
      }));
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

      // Гарантируем, что чат есть в списке (важно для UI поп-апа и сортировки)
      setChatList((prev) => {
        const exists = prev.some((x) => x.chatId === chatId);
        if (exists) return prev;
        const item: ChatListItem = {
          chatId,
          profile,
          lastMessageAt: null,
          lastMessagePreview: null,
        };
        return [item, ...prev];
      });

      // Загружаем последние 5 сообщений
      let msgsQuery = supabase
        .from("messages")
        .select("id, content, sender_id, created_at")
        .eq("chat_id", chatId);

      if (blockedProfileIds.includes(profile.id)) {
        msgsQuery = msgsQuery.neq("sender_id", profile.id);
      }

      const { data: msgsData, error: msgsError } = await msgsQuery
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
        const item = {
          ...next[idx],
          lastMessageAt: (data as any).created_at,
          lastMessagePreview: content,
        };
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
      const target = event.target as HTMLElement | null;
      // Если открыт поп-ап профиля, взаимодействие с ним не должно закрывать чат
      if (target?.closest?.("[data-profile-card]")) return;
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

  // закрытие поп-апа профиля по клику вне и Esc
  useEffect(() => {
    if (!activeProfileOverlay) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.("[data-profile-card]")) return;
      setActiveProfileOverlay(null);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveProfileOverlay(null);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [activeProfileOverlay]);

  const showChatsColumn =
    mobileTab === "my-chats" || mobileTab === "contacts";

  return (
    <div className="flex h-[calc(100vh-8vh)] flex-col overflow-hidden bg-gray-100">
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden pb-[8vh] lg:flex-row lg:pb-0">
        {/* Левая колонка: лента запросов, как список чата */}
        <section
          className={`flex h-full min-h-0 w-full flex-col overflow-hidden bg-white shadow-lg lg:w-80 lg:shrink-0 lg:border-r lg:border-gray-200 ${
            mobileTab === "chat" ? "flex" : "hidden"
          } lg:flex`}
        >
          <header className="flex shrink-0 items-center gap-2 border-b border-gray-200 px-4 py-3">
            <svg
              className="h-5 w-5 shrink-0 text-slate-900"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 7.5 7.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            <h1 className="font-semibold text-slate-900">Общий чат</h1>
          </header>

          <div
            ref={feedScrollRef}
            className="min-h-0 flex-1 overflow-y-auto px-4"
          >
          {loading && <p className="py-2 text-sm text-slate-500">Загрузка...</p>}
          {error && <p className="py-2 text-sm text-red-600">{error}</p>}

          {!loading && posts.length === 0 && (
            <p className="py-2 text-sm text-slate-500">
              Пока нет запросов. Создай первый пост позже — мы добавим форму.
            </p>
          )}

          {/* Список постов с прокруткой */}
          <div className="space-y-4 py-4">
            <ul className="space-y-1">
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

                const openAuthorCard = () => {
                  const p = profiles.find((pr) => pr.id === post.author_id);
                  if (p) {
                    setActiveProfileOverlay(p);
                    void markProfileViewed(p.id);
                  }
                };

                return (
                  <li
                    key={post.id}
                    className="group -mx-2 cursor-pointer rounded-lg px-2 py-2 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex gap-3">
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const inner = (e.currentTarget as HTMLElement)
                              .firstElementChild as HTMLElement;
                            void inner;
                            openAuthorCard();
                          }}
                          title={authorOnline ? "Онлайн" : "Оффлайн"}
                          className="block shrink-0 cursor-pointer border-0 bg-transparent p-0 text-left"
                        >
                          <div className="relative flex h-12 w-12 items-center justify-center overflow-visible rounded-full bg-slate-900 text-sm font-medium text-white">
                            {(authorName[0] || "?").toUpperCase()}
                            <div
                              className={`pointer-events-none absolute bottom-0 right-0 z-[1] box-border h-4 w-4 rounded-full border-2 border-white ${
                                authorOnline ? "bg-emerald-500" : "bg-gray-400"
                              }`}
                              aria-hidden
                            />
                          </div>
                        </button>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openAuthorCard();
                            }}
                            className="text-left text-sm font-medium text-slate-900 hover:text-emerald-600"
                          >
                            {authorName}
                          </button>
                          {prof ? (
                            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-slate-700">
                              {prof}
                            </span>
                          ) : null}
                        </div>
                        {body ? (
                          <p className="mb-1 text-sm text-slate-600">{text}</p>
                        ) : null}
                        <span className="text-xs text-gray-400">
                          {post.created_at ? formatDateTime(post.created_at) : ""}
                        </span>
                        {shouldTruncate && (
                          <button
                            type="button"
                            onClick={() => handleTogglePost(post.id)}
                            className="mt-1 block text-xs font-medium text-emerald-600 hover:underline"
                          >
                            {isExpanded ? "Свернуть" : "Читать далее"}
                          </button>
                        )}
                        {/* Комментарии под постами временно скрыты (по запросу). */}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          </div>

          {/* Форма нового сообщения */}
          <form
            onSubmit={handleCreatePost}
            className="mt-auto space-y-2 border-t border-gray-200 bg-gray-50 p-4"
          >
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
              className="min-h-[80px] w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
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
              <span className="text-xs text-gray-400">
                {newPostBody.length}/1000
              </span>
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-60"
              >
                {creating ? "Отправляем..." : "Отправить"}
              </button>
            </div>
            {createError && (
              <p className="text-[11px] text-red-600">{createError}</p>
            )}
          </form>
        </section>

        {/* Центр: карта во всю высоту */}
        <section
          id="main-map"
          className={`flex h-full min-h-0 flex-1 flex-col bg-white lg:min-w-0 ${
            mobileTab === "map" ? "flex" : "hidden"
          } lg:flex`}
        >
          <div ref={mapContainerRef} className="relative min-h-0 flex-1">
            <div className="pointer-events-none absolute inset-0 z-[1100]">
              <div
                ref={feedFiltersRef}
                className="pointer-events-auto absolute top-[10px] right-[10px] z-[1200]"
              >
              <button
                type="button"
                onClick={() => setFeedFiltersOpen((v) => !v)}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border p-0 text-slate-900 shadow-sm transition hover:scale-105 ${
                  hasActiveFeedFilters
                    ? "border-[#009966] bg-[#009966] hover:bg-[#009966]/90"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
                aria-label="Настройки поиска"
                title="Настройки"
              >
                <img
                  src="/Icons/Sliders.svg"
                  alt="Настройки"
                  className={`h-4 w-4 ${hasActiveFeedFilters ? "invert" : ""}`}
                />
              </button>

              {feedFiltersOpen && (
                <div
                  className="pointer-events-auto absolute right-0 top-[calc(100%+0.5rem)] z-[1200] w-[min(calc(100vw-2rem),300px)] rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-xl"
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
                        placeholder="Любой"
                        searchable
                        searchPlaceholder="Найти профессию"
                        options={[
                          { value: "", label: "Любой" },
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
                        placeholder="Любой"
                        searchable
                        searchPlaceholder="Найти отрасль"
                        options={[
                          { value: "", label: "Любой" },
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
                          feedFilters.industry ? "Любой" : "Сначала выберите отрасль"
                        }
                        searchable
                        searchPlaceholder="Найти подотрасль"
                        options={[
                          { value: "", label: "Любой" },
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
                          { value: "", label: "Любой" },
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
                        className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-1 text-[11px] font-semibold text-white shadow-md hover:from-emerald-600 hover:to-emerald-700"
                      >
                        Поиск
                      </button>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
            <PartnerMap
              profiles={filteredProfilesForMap}
              contactProfileIds={contactProfileIds}
              viewedProfileIds={viewedProfileIds}
              invalidateKey={`${mobileTab}-${selectedCity}-${contactsOnlyMode ? 1 : 0}-${mapContactsOnly ? 1 : 0}`}
              center={mapConfig.center}
              zoom={mapConfig.zoom}
              onOpenProfile={(p) => {
                const full = profiles.find((x) => x.id === p.id) ?? null;
                setActiveProfileOverlay(full);
                if (full) void markProfileViewed(full.id);
              }}
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
        <aside
          className={`flex h-full min-h-0 w-full flex-col overflow-hidden bg-white shadow-lg lg:w-80 lg:shrink-0 lg:border-l lg:border-gray-200 ${
            showChatsColumn ? "flex" : "hidden"
          } lg:flex`}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 shrink-0 text-slate-900"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <path d="M13 8H7" />
                <path d="M17 12H7" />
              </svg>
              <h2 className="font-semibold text-slate-900">
                {contactsOnlyMode ? "Контакты" : "Мои чаты"}
              </h2>
            </div>
            {contactsOnlyMode ? (
              <button
                type="button"
                onClick={() => {
                  resetContactsMode();
                  setMobileTab("my-chats");
                }}
                className="rounded-full border border-gray-200 px-3 py-1 text-[11px] font-medium text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50/50 hover:text-emerald-700"
              >
                Сбросить
              </button>
            ) : null}
          </div>

          {!loading && filteredChatList.length === 0 && (
            <p className="px-4 py-2 text-sm text-slate-500">
              {contactsOnlyMode
                ? "У вас пока нет личных диалогов с контактами. Добавьте контакт или начните переписку."
                : "У вас пока нет личных диалогов. Начните переписку, чтобы чат появился в списке."}
            </p>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <ul className="space-y-3">
              {filteredChatList.map((item) => {
                const unread = unreadByUser[item.profile.id] ?? 0;
                const name = item.profile.full_name || "Без имени";
                const online = isOnline(item.profile.last_seen_at ?? null);
                return (
                <li
                  key={item.profile.id}
                  onClick={() => openChatFromList(item)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all hover:border-gray-300 hover:shadow-lg ${
                    unread > 0
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div className="relative flex h-12 w-12 items-center justify-center overflow-visible rounded-full bg-slate-900 text-sm font-medium text-white">
                        {(name[0] || "?").toUpperCase()}
                        <div
                          className={`pointer-events-none absolute bottom-0 right-0 z-[1] box-border h-4 w-4 rounded-full border-2 border-white ${
                            online ? "bg-emerald-500" : "bg-gray-400"
                          }`}
                          aria-hidden
                        />
                      </div>
                      {unread > 0 ? (
                        <div className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-md">
                          {unread > 9 ? "9+" : unread}
                        </div>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveProfileOverlay(item.profile);
                            void markProfileViewed(item.profile.id);
                          }}
                          className="truncate text-left font-medium text-slate-900 hover:text-emerald-600"
                        >
                          {name}
                        </button>
                        {item.profile.rating_count != null &&
                        item.profile.rating_count > 0 ? (
                          <span className="shrink-0 text-xs font-medium text-amber-500">
                            ★ {item.profile.rating_count}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-slate-600">
                        {item.profile.role_title || "Профессия не указана"}
                      </p>
                      <p className="text-sm text-slate-500">
                        {item.profile.city || "Город не указан"}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {formatChatListPreview(item.lastMessagePreview) ??
                          "Нет сообщений"}
                      </p>
                    </div>
                  </div>
                </li>
              );
              })}
            </ul>
          </div>
        </aside>

        {/* Окно диалога поверх карты и списка чатов */}
        {activeChatUser && (
          <div
            ref={chatWindowRef}
            className="pointer-events-auto fixed inset-0 z-[1600] flex flex-col overflow-hidden bg-white lg:top-16 lg:right-[336px] lg:left-auto lg:bottom-auto lg:h-[380px] lg:w-[min(100vw-1rem,24rem)] lg:max-w-sm lg:rounded-2xl lg:border lg:border-slate-200/80 lg:shadow-[0_20px_50px_rgba(15,23,42,0.15)] lg:ring-1 lg:ring-slate-900/5"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/40 px-3 py-2.5">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveProfileOverlay(activeChatUser);
                    void markProfileViewed(activeChatUser.id);
                  }}
                  title={
                    isOnline(activeChatUser.last_seen_at ?? null)
                      ? "Онлайн"
                      : "Оффлайн"
                  }
                  className="group flex w-full min-w-0 items-start gap-2 text-left"
                >
                  <div className="relative shrink-0">
                    <div className="relative flex h-10 w-10 items-center justify-center overflow-visible rounded-full bg-slate-900 text-sm font-medium text-white">
                      {(activeChatUser.full_name?.[0] || "?").toUpperCase()}
                      <div
                        className={`pointer-events-none absolute bottom-0 right-0 z-[1] box-border h-4 w-4 rounded-full border-2 border-white ${
                          isOnline(activeChatUser.last_seen_at ?? null)
                            ? "bg-emerald-500"
                            : "bg-gray-400"
                        }`}
                        aria-hidden
                      />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900 group-hover:text-emerald-600">
                      {activeChatUser.full_name || "Без имени"}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {activeChatUser.role_title ||
                        activeChatUser.city ||
                        "Профессия не указана"}
                    </p>
                  </div>
                </button>
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
                            ? "ml-auto bg-[#009966] text-white"
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
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/20"
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
                    className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-1 text-xs font-medium text-white shadow-sm transition hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-60"
                  >
                    {chatSending ? "Отправляем..." : "Отправить"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Поп-ап профиля должен открываться и на мобилке (вкладка "Карта") */}
        {activeProfileOverlay && (
          <ProfilePreviewCard
            rootDataAttr
            variant="floating"
            profile={activeProfileOverlay}
            online={isOnline(activeProfileOverlay.last_seen_at ?? null)}
            style={{
              left: "50%",
              // Keep the popup fully visible between TopBar (8vh) and bottom nav (8vh) on mobile.
              top: "calc(8vh + env(safe-area-inset-top) + 8px)",
              transform: "translateX(-50%)",
              maxHeight:
                "calc(100vh - 8vh - 8vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 16px)",
            }}
            onClose={() => setActiveProfileOverlay(null)}
            profileHref={`/profiles/${activeProfileOverlay.id}`}
            onWrite={() => {
              openChatWithProfile(activeProfileOverlay);
              setActiveProfileOverlay(null);
            }}
            showContactButton={
              !!currentUser?.profileId &&
              currentUser.profileId !== activeProfileOverlay.id
            }
            isInContacts={contactProfileIds.includes(activeProfileOverlay.id)}
            onToggleContact={() => toggleContact(activeProfileOverlay.id)}
            showBlockButton={
              !!currentUser?.profileId &&
              currentUser.profileId !== activeProfileOverlay.id
            }
            isBlocked={blockedProfileIds.includes(activeProfileOverlay.id)}
            blockButtonDisabled={!!blockBusyByProfileId[activeProfileOverlay.id]}
            onToggleBlock={() => toggleBlock(activeProfileOverlay.id)}
          />
        )}
      </main>
      <MainMobileNav
        activeTab={mobileTab}
        onTabChange={handleMobileTab}
        unreadChatsCount={unreadChatsTotal}
      />
    </div>
  );
}
