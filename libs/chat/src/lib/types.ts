import type { SubscriptionPlan } from "@my-startup/subscription";

/** Доменные типы для чатов. */

export type ChatMessage = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  edited_at?: string | null;
};

export type ChatListItem = {
  chatId: string | null;
  profile: Profile;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
};

export type Profile = {
  id: string;
  full_name: string | null;
  age?: number | null;
  city: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  last_seen_at?: string | null;
  content_updated_at?: string | null;
  skills?: string | null;
  resources?: string | null;
  industry?: string | null;
  subindustry?: string | null;
  role_title?: string | null;
  experience_years?: number | null;
  current_status?: string | null;
  interested_in?: string | null;
  seeking?: string[] | null;
  is_pro?: boolean | null;
  pro_expires_at?: string | null;
  trial_used?: boolean | null;
  subscription_plan?: SubscriptionPlan | null;
  work_blocks?: ProfileWorkBlock[];
};

export type ProfileWorkBlock = {
  id?: string;
  role_title: string | null;
  industry: string | null;
  subindustry: string | null;
  experience_years: number | null;
  sort_order?: number;
};

export type CurrentUser = {
  profileId: string;
  fullName: string | null;
  city: string | null;
  roleTitle: string | null;
  isBlocked: boolean;
  isPro: boolean;
  subscriptionPlan: SubscriptionPlan;
  trialUsed: boolean;
  onboardingCompleted: boolean;
  onboardingStep: number;
};

export type PostCommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: any;
};