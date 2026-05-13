/** Общие доменные типы (вынесены из page.tsx для переиспользования). */

export type Post = {
  id: string;
  body: string | null;
  city: string | null;
  created_at: string;
  edited_at?: string | null;
  author_id: string;
  author: unknown;
};

export type Profile = {
  id: string;
  full_name: string | null;
  age?: number | null;
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
  interested_in?: string | null;
};

export type FeedFilters = {
  profession: string | null;
  industry: string | null;
  subindustry: string | null;
  current_status: string | null;
  online_status: "online" | "offline" | null;
  age_from: number | null;
  age_to: number | null;
};

export const DEFAULT_FEED_FILTERS: FeedFilters = {
  profession: null,
  industry: null,
  subindustry: null,
  current_status: null,
  online_status: null,
  age_from: null,
  age_to: null,
};

export type CurrentUser = {
  profileId: string;
  fullName: string | null;
  city: string | null;
  isBlocked: boolean;
};

export type ChatMessage = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  edited_at?: string | null;
};

export type ChatListItem = {
  chatId: string;
  profile: Profile;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
};
