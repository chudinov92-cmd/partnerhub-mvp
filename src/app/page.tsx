"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { PartnerMapProps } from "@/components/PartnerMap";
import { deleteBlock, insertBlock } from "@/services/contactService";
import {
  formatChatListPreview,
  openOrEnsurePrivateChat,
  fetchRecentMessages,
  updateMessageContent,
  insertMessage,
} from "@/services/chatService";
import {
  updatePostBody,
  insertPost as insertFeedPost,
  insertPostComment,
} from "@/services/feedService";
import type {
  Post,
  Profile,
  FeedFilters,
  ChatMessage,
  ChatListItem,
} from "@/types";
import { DEFAULT_FEED_FILTERS } from "@/types";
import { maskProfanity } from "@/lib/profanity";
import {
  getProfessionLabelsForSelect,
  type ProfessionCatalogRow,
} from "@/lib/professionCatalog";
import { DropdownSelect } from "@/components/DropdownSelect";
import {
  getIndustryLabelsForSelect,
  getSubindustryLabelsForSelect,
  type IndustryCatalogRow,
  type SubindustryCatalogRow,
} from "@/lib/industryCatalog";
import { getBrowserTimeZone, getTimeZoneByCity } from "@/lib/cityTimezone";
import { useSelectedCity } from "@/contexts/SelectedCityContext";
import { getMapConfigForCity } from "@/data/cityMapViews";
import type { PostCommentRow } from "@/components/PostComments";
import { PushOptInBanner } from "@/components/PushOptInBanner";
import { useAuth } from "@/hooks/useAuth";
import { useContacts } from "@/hooks/useContacts";
import { useMobileNav } from "@/hooks/useMobileNav";
import { useFeed } from "@/hooks/useFeed";
import { useProfiles } from "@/hooks/useProfiles";
import { useChatMessagesRealtime } from "@/hooks/useChat";

const PartnerMap = dynamic<PartnerMapProps>(
  () => import("@/components/PartnerMap").then((m) => m.PartnerMap),
  { ssr: false },
);
const MainMobileNav = dynamic(
  () => import("@/components/MainMobileNav").then((m) => m.MainMobileNav),
  { ssr: false },
);
const ProfilePreviewCard = dynamic(
  () => import("@/components/ProfilePreviewCard").then((m) => m.ProfilePreviewCard),
  { ssr: false },
);

const ONLINE_WINDOW_MS = 2 * 60 * 1000;

function isOnline(lastSeenAt?: string | null) {
  if (!lastSeenAt) return false;
  const t = new Date(lastSeenAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= ONLINE_WINDOW_MS;
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

function usePreventBodyScroll() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';

    let rafId: number;
    const poll = () => {
      if (window.scrollY !== 0) window.scrollTo(0, 0);
      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);

    return () => {
      cancelAnimationFrame(rafId);
      html.style.overflow = '';
      body.style.overflow = '';
      html.style.overscrollBehavior = '';
      body.style.overscrollBehavior = '';
    };
  }, []);
}

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

export default function Home() {
  usePreventBodyScroll();

  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(
    () => new Set(),
  );
  const [feedFiltersOpen, setFeedFiltersOpen] = useState(false);
  const [mapViewMode, setMapViewMode] = useState<"map" | "list">("map");
  const [feedFilters, setFeedFilters] = useState<FeedFilters>(
    () => DEFAULT_FEED_FILTERS,
  );
  const hasActiveFeedFilters = Boolean(
    feedFilters.profession ||
      feedFilters.industry ||
      feedFilters.subindustry ||
      feedFilters.current_status ||
      feedFilters.online_status ||
      feedFilters.age_from != null ||
      feedFilters.age_to != null,
  );
  const [newPostBody, setNewPostBody] = useState("");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [activeChatUser, setActiveChatUser] = useState<Profile | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatSending, setChatSending] = useState(false);
  const [unreadByUser, setUnreadByUser] = useState<Record<string, number>>({});
  const [generalChatSearch, setGeneralChatSearch] = useState("");
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatWindowRef = useRef<HTMLDivElement | null>(null);
  const feedScrollRef = useRef<HTMLDivElement | null>(null);
  const [activeProfileOverlay, setActiveProfileOverlay] =
    useState<Profile | null>(null);
  const [focusedProfileId, setFocusedProfileId] = useState<string | null>(null);
  const feedFiltersRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [blockBusyByProfileId, setBlockBusyByProfileId] = useState<
    Record<string, boolean>
  >({});
  const router = useRouter();
  const {
    contactsOnlyMode,
    mapContactsOnly,
    mobileTab,
    handleMobileTab,
    resetContactsMode,
    setMobileTab,
  } = useMobileNav();

  const {
    profiles,
    chatList,
    setChatList,
    currentUser,
    loading,
    error,
    chatMembershipRef,
  } = useAuth([]);

  const {
    contactProfileIds,
    viewedProfileIds,
    blockedProfileIds,
    setBlockedProfileIds,
    toggleContact,
    markProfileViewed,
  } = useContacts(currentUser);

  const { selectedCity } = useSelectedCity();

  const {
    posts,
    setPosts,
    commentsByPostId,
    setCommentsByPostId,
    postsLoading,
    postsLoadError,
    postsFingerprintRef,
  } = useFeed(selectedCity);

  const { professionCatalog, industryCatalog, subindustryCatalog } =
    useProfiles();

  /** Сброс эффекта открытия чата по ?chat= после router.replace / SW. */
  const [chatDeepLinkNonce, setChatDeepLinkNonce] = useState(0);
  const mapConfig = useMemo(
    () => getMapConfigForCity(selectedCity),
    [selectedCity],
  );

  const timeZone = useMemo(() => {
    const tzFromProfileCity = getTimeZoneByCity(currentUser?.city);
    return tzFromProfileCity ?? getBrowserTimeZone() ?? "Europe/Moscow";
  }, [currentUser?.city]);

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

  useEffect(() => {
    setEditingPostId(null);
    setNewPostBody("");
    setCreateError(null);
  }, [selectedCity]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const d = e.data as { type?: string; profileId?: string };
      if (d?.type === "ZEIP_OPEN_CHAT" && typeof d.profileId === "string") {
        router.replace(`/?chat=${encodeURIComponent(d.profileId)}`);
        setChatDeepLinkNonce((n) => n + 1);
      }
    };
    if (typeof navigator !== "undefined" && navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", handler);
      return () => navigator.serviceWorker.removeEventListener("message", handler);
    }
  }, [router]);

  // Автооткрытие чата: ?chat=<profiles.id собеседника>
  useEffect(() => {
    if (!currentUser || !profiles.length || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const chatProfileId = params.get("chat");
    if (!chatProfileId) return;
    const p = profiles.find((pr) => pr.id === chatProfileId);
    if (p) {
      void openChatWithProfile(p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- открываем только при смене списков/URL-nonce
  }, [currentUser, profiles, chatDeepLinkNonce]);

  useChatMessagesRealtime({
    currentUser,
    activeChatId,
    blockedProfileIds,
    chatMembershipRef,
    setChatMessages,
    setUnreadByUser,
    setChatList,
  });

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
      if (feedFilters.online_status) {
        const online = isOnline(a.last_seen_at ?? null);
        if (feedFilters.online_status === "online" && !online) return false;
        if (feedFilters.online_status === "offline" && online) return false;
      }
      if (feedFilters.age_from != null || feedFilters.age_to != null) {
        const age = typeof a.age === "number" ? a.age : null;
        if (age == null) return false;
        if (feedFilters.age_from != null && age < feedFilters.age_from) return false;
        if (feedFilters.age_to != null && age > feedFilters.age_to) return false;
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

  const searchedVisiblePosts = useMemo(() => {
    const q = generalChatSearch.trim().toLocaleLowerCase("ru-RU");
    if (!q) return visiblePosts;

    const normalizedAuthor = (a: any) => (Array.isArray(a) ? a[0] : a);

    return visiblePosts.filter((post) => {
      const body = String(post.body ?? "").toLocaleLowerCase("ru-RU");
      if (body.includes(q)) return true;
      const a = normalizedAuthor(post.author);
      const authorName = String(a?.full_name ?? "").toLocaleLowerCase("ru-RU");
      const role = String(a?.role_title ?? "").toLocaleLowerCase("ru-RU");
      return authorName.includes(q) || role.includes(q);
    });
  }, [visiblePosts, generalChatSearch]);

  useEffect(() => {
    const el = feedScrollRef.current;
    if (!el) return;
    // После отрисовки контейнера прокручиваем к последнему сообщению (низ ленты)
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [visiblePosts, loading, postsLoading, feedFilters]);

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
      if (feedFilters.online_status) {
        const online = isOnline(p.last_seen_at ?? null);
        if (feedFilters.online_status === "online" && !online) return false;
        if (feedFilters.online_status === "offline" && online) return false;
      }
      if (feedFilters.age_from != null || feedFilters.age_to != null) {
        const age = typeof p.age === "number" ? p.age : null;
        if (age == null) return false;
        if (feedFilters.age_from != null && age < feedFilters.age_from) return false;
        if (feedFilters.age_to != null && age > feedFilters.age_to) return false;
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
        await deleteBlock(currentUser.profileId, profileId);
      } else {
        await insertBlock(currentUser.profileId, profileId);
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
      if (editingPostId) {
        const { data, error } = await updatePostBody(editingPostId, body);
        if (error) throw error;

        setPosts((prev) =>
          prev.map((p) => (p.id === editingPostId ? (data as Post) : p)),
        );
        setEditingPostId(null);
        setNewPostBody("");
      } else {
        const { data, error } = await insertFeedPost({
          authorId: currentUser.profileId,
          body,
          city: selectedCity,
        });
        if (error) throw error;

        setPosts((prev) => {
          const next = [data as Post, ...prev];
          return next.slice(0, 20);
        });
        setNewPostBody("");
      }
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
    const { data, error } = await insertPostComment({
      postId,
      authorId: currentUser.profileId,
      body: masked,
    });
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
      const chatId = await openOrEnsurePrivateChat(
        currentUser.profileId,
        profile.id,
      );

      setActiveChatId(chatId);
      chatMembershipRef.current.add(chatId);

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

      const excludeSenderIds = blockedProfileIds.includes(profile.id)
        ? [profile.id]
        : undefined;
      const normalized = await fetchRecentMessages(chatId, {
        excludeSenderIds,
      });

      setChatMessages(normalized);
      setEditingMessageId(null);
      setChatInput("");
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

      if (editingMessageId) {
        const { data, error } = await updateMessageContent(
          editingMessageId,
          content,
        );
        if (error) throw error;

        setChatMessages((prev) =>
          prev.map((m) => (m.id === editingMessageId ? (data as ChatMessage) : m)),
        );
        setEditingMessageId(null);
        setChatInput("");

        // Если редактировали последнее сообщение — обновим превью в списке
        setChatList((prev) => {
          if (!activeChatId) return prev;
          const idx = prev.findIndex((x) => x.chatId === activeChatId);
          if (idx < 0) return prev;
          const next = [...prev];
          const item = {
            ...next[idx],
            lastMessagePreview: content,
          };
          next[idx] = item;
          return next;
        });
      } else {
        const { data, error } = await insertMessage({
          chatId: activeChatId,
          senderId: currentUser.profileId,
          content,
        });
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
      }
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
    <div className="zeip-main-stack flex flex-col overflow-hidden bg-gray-100">
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] lg:flex-row lg:pb-0">
        {/* Левая колонка: лента запросов, как список чата */}
        <section
          className={`flex h-full min-h-0 w-full flex-col overflow-hidden bg-white shadow-lg lg:w-80 lg:shrink-0 lg:border-r lg:border-gray-200 ${
            mobileTab === "chat" ? "flex" : "hidden"
          } lg:flex`}
        >
          <header className="shrink-0 border-b border-gray-200 px-4 py-3">
            <div className="flex items-start gap-2">
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
            <div className="min-w-0 flex-1">
              <h1 className="min-w-0 font-semibold leading-tight text-slate-900">
                <span className="block">Общий чат</span>
                <span className="block truncate text-xs font-normal text-slate-500">
                  {selectedCity}
                </span>
              </h1>

              <div className="mt-2 flex items-center gap-2">
                <label htmlFor="general-chat-search" className="sr-only">
                  Поиск по сообщениям общего чата
                </label>
                <input
                  id="general-chat-search"
                  value={generalChatSearch}
                  onChange={(e) => setGeneralChatSearch(e.target.value.slice(0, 60))}
                  placeholder="Поиск по сообщениям…"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
                {generalChatSearch.trim() ? (
                  <button
                    type="button"
                    onClick={() => setGeneralChatSearch("")}
                    className="shrink-0 rounded-lg px-2 py-2 text-xs font-semibold text-slate-600 transition hover:bg-gray-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    aria-label="Очистить поиск"
                    title="Очистить"
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </div>
            </div>
          </header>

          <div
            ref={feedScrollRef}
            className="min-h-0 flex-1 overflow-y-auto px-4"
          >
          {(loading || postsLoading) && (
            <p className="py-2 text-sm text-slate-500">Загрузка...</p>
          )}
          {error && <p className="py-2 text-sm text-red-600">{error}</p>}
          {postsLoadError && (
            <p className="py-2 text-sm text-red-600">{postsLoadError}</p>
          )}

          {!loading && !postsLoading && posts.length === 0 && (
            <p className="py-2 text-sm text-slate-500">
              В чате «{selectedCity}» пока нет сообщений. Напишите первым.
            </p>
          )}

          {!loading &&
            !postsLoading &&
            posts.length > 0 &&
            searchedVisiblePosts.length === 0 && (
              <p className="py-2 text-sm text-slate-500">
                Ничего не найдено по запросу «{generalChatSearch.trim()}».
              </p>
            )}

          {/* Список постов с прокруткой */}
          <div className="space-y-4 py-4">
            <ul className="space-y-1">
              {searchedVisiblePosts.map((post) => {
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
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-400">
                            {post.created_at ? formatDateTime(post.created_at) : ""}
                            {post.edited_at ? " · изменено" : ""}
                          </span>
                          {currentUser?.profileId &&
                          post.author_id === currentUser.profileId ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingPostId(post.id);
                                setNewPostBody(post.body ?? "");
                              }}
                              className="text-xs font-medium text-emerald-600 hover:underline"
                            >
                              Изменить
                            </button>
                          ) : null}
                        </div>
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
            {editingPostId ? (
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-amber-600">
                  Режим редактирования
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPostId(null);
                    setNewPostBody("");
                  }}
                  className="text-[11px] font-medium text-slate-600 hover:underline"
                >
                  Отмена
                </button>
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {newPostBody.length}/1000
              </span>
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-60"
              >
                {creating
                  ? "Отправляем..."
                  : editingPostId
                    ? "Сохранить"
                    : "Отправить"}
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
                className="pointer-events-auto absolute top-[10px] right-[10px] z-[1200] flex items-center gap-2"
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

              <button
                type="button"
                onClick={() =>
                  setMapViewMode((v) => (v === "map" ? "list" : "map"))
                }
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border p-0 text-slate-900 shadow-sm transition hover:scale-105 ${
                  mapViewMode === "list"
                    ? "border-[#009966] bg-[#009966] hover:bg-[#009966]/90"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
                aria-label={mapViewMode === "map" ? "Список" : "Карта"}
                title={mapViewMode === "map" ? "Список" : "Карта"}
              >
                <img
                  src={mapViewMode === "map" ? "/Icons/List.svg" : "/Icons/Map.svg"}
                  alt={mapViewMode === "map" ? "Список" : "Карта"}
                  className={`h-4 w-4 ${mapViewMode === "list" ? "invert" : ""}`}
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

                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">
                        Онлайн / оффлайн
                      </label>
                      <DropdownSelect
                        value={feedFilters.online_status ?? ""}
                        placeholder="Любой"
                        options={[
                          { value: "", label: "Любой" },
                          { value: "online", label: "Онлайн" },
                          { value: "offline", label: "Оффлайн" },
                        ]}
                        onChange={(v) => {
                          const next: FeedFilters = {
                            ...feedFilters,
                            online_status:
                              v === "online" || v === "offline" ? v : null,
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
                        Возраст
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-[10px] text-slate-500">
                            От
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={80}
                            value={feedFilters.age_from ?? ""}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const n = raw === "" ? null : Number(raw);
                              const next: FeedFilters = {
                                ...feedFilters,
                                age_from:
                                  raw === "" ? null : Number.isFinite(n) ? n : null,
                              };
                              setFeedFilters(next);
                              if (typeof window !== "undefined") {
                                window.localStorage.setItem(
                                  "feed_filters",
                                  JSON.stringify(next),
                                );
                              }
                            }}
                            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] text-slate-500">
                            До
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={80}
                            value={feedFilters.age_to ?? ""}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const n = raw === "" ? null : Number(raw);
                              const next: FeedFilters = {
                                ...feedFilters,
                                age_to:
                                  raw === "" ? null : Number.isFinite(n) ? n : null,
                              };
                              setFeedFilters(next);
                              if (typeof window !== "undefined") {
                                window.localStorage.setItem(
                                  "feed_filters",
                                  JSON.stringify(next),
                                );
                              }
                            }}
                            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                            placeholder="80"
                          />
                        </div>
                      </div>
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
            {activeProfileOverlay ? (
              <div
                className="pointer-events-auto absolute inset-0 z-[1050] backdrop-blur-[2px] transition-[opacity,backdrop-filter] duration-200"
                aria-hidden
              />
            ) : null}
            {mapViewMode === "map" ? (
              <PartnerMap
                profiles={filteredProfilesForMap}
                contactProfileIds={contactProfileIds}
                viewedProfileIds={viewedProfileIds}
                focusedProfileId={focusedProfileId}
                currentUserProfileId={currentUser?.profileId ?? null}
                invalidateKey={`${mobileTab}-${selectedCity}-${contactsOnlyMode ? 1 : 0}-${mapContactsOnly ? 1 : 0}-${mapViewMode}`}
                center={mapConfig.center}
                zoom={mapConfig.zoom}
                onOpenProfile={(p) => {
                  const full = profiles.find((x) => x.id === p.id) ?? null;
                  setActiveProfileOverlay(full);
                  setFocusedProfileId(null);
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
            ) : (
              <div className="h-full min-h-0 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur">
                  <p className="text-sm font-semibold text-slate-900">
                    Профили
                  </p>
                  <p className="text-xs text-slate-500">
                    Сортировка: рейтинг по убыванию
                  </p>
                </div>
                <div className="space-y-2 p-3">
                  {filteredProfilesForMap
                    .slice()
                    .sort(
                      (a, b) =>
                        (b.rating_count ?? 0) - (a.rating_count ?? 0),
                    )
                    .map((p) => {
                      const name = p.full_name || "Пользователь";
                      const initial = (name[0] || "?").toUpperCase();
                      const industry = (p.industry ?? "").trim();
                      const sub = (p.subindustry ?? "").trim();
                      const role = (p.role_title ?? "").trim();
                      const age =
                        typeof (p as any).age === "number" ? (p as any).age : null;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setActiveProfileOverlay(p);
                            setFocusedProfileId(null);
                            void markProfileViewed(p.id);
                          }}
                          className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-white">
                            {initial}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {name}
                                </p>
                                <p className="truncate text-xs text-slate-500">
                                  {p.city || "Город не указан"}
                                  {age != null ? ` · ${age} лет` : ""}
                                </p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-xs font-semibold text-amber-600">
                                  ★ {p.rating_count ?? 0}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {role ? (
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                                  {role}
                                </span>
                              ) : null}
                              {industry ? (
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                                  {industry}
                                </span>
                              ) : null}
                              {sub ? (
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                                  {sub}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
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

          {currentUser && !contactsOnlyMode ? (
            <PushOptInBanner hasSession />
          ) : null}

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
                        className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-[12px] ${
                          m.sender_id === currentUser?.profileId
                            ? "ml-auto bg-[#009966] text-white"
                            : "mr-auto bg-slate-50/70 text-slate-900"
                        }`}
                      >
                        <p>{m.content}</p>
                        <div
                          className={`mt-1 flex items-center justify-between gap-2 text-[10px] ${
                            m.sender_id === currentUser?.profileId
                              ? "text-white/80"
                              : "text-slate-400"
                          }`}
                        >
                          <span className="truncate">
                            {m.created_at ? formatDateTime(m.created_at) : ""}
                            {m.edited_at ? " · изменено" : ""}
                          </span>
                          {m.sender_id === currentUser?.profileId ? (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMessageId(m.id);
                                setChatInput(m.content ?? "");
                              }}
                              className="shrink-0 underline-offset-2 hover:underline"
                            >
                              Изменить
                            </button>
                          ) : null}
                        </div>
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
                {editingMessageId ? (
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-amber-600">
                      Режим редактирования
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMessageId(null);
                        setChatInput("");
                      }}
                      className="text-[11px] font-medium text-slate-600 hover:underline"
                    >
                      Отмена
                    </button>
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    {chatInput.length}/1000
                  </span>
                  <button
                    type="submit"
                    disabled={chatSending || !chatInput.trim()}
                    className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-1 text-xs font-medium text-white shadow-sm transition hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-60"
                  >
                    {chatSending
                      ? "Отправляем..."
                      : editingMessageId
                        ? "Сохранить"
                        : "Отправить"}
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
            viewerProfileId={currentUser?.profileId ?? null}
            style={{
              left: "50%",
              // Keep the popup fully visible between TopBar (3.5rem) and bottom nav (3.5rem) on mobile.
              top: "calc(3.5rem + env(safe-area-inset-top, 0px) + 8px)",
              transform: "translateX(-50%)",
              maxHeight:
                "calc(100vh - 3.5rem - 3.5rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 16px)",
            }}
            onClose={() => setActiveProfileOverlay(null)}
            profileHref={`/profiles/${activeProfileOverlay.id}`}
            onShowOnMap={() => {
              setFocusedProfileId(activeProfileOverlay.id);
              setActiveProfileOverlay(null);
              setMobileTab("map");
            }}
            onFilterProfession={(profession) => {
              const next: FeedFilters = {
                ...feedFilters,
                profession: profession || null,
              };
              setFeedFilters(next);
              if (typeof window !== "undefined") {
                window.localStorage.setItem(
                  "feed_filters",
                  JSON.stringify(next),
                );
              }
              setActiveProfileOverlay(null);
              setMobileTab("map");
            }}
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
