"use client";

import type { PostCommentRow } from "@/components/PostComments";
import { supabase } from "@/lib/supabaseClient";
import type { Post } from "@/types";
import { MAX_COMMENTS_FETCH } from "@/services/constants";

const POST_SELECT =
  "id, body, city, created_at, edited_at, author_id, author:profiles(full_name, age, role_title, last_seen_at, current_status, industry, subindustry)";

function postsQuery(selectedCity: string) {
  return supabase.from("posts").select(POST_SELECT).eq("city", selectedCity);
}

/** Загрузка постов общего чата с fallback, если moderation_status ещё нет в схеме. */
export async function fetchPostsForCity(selectedCity: string): Promise<{
  posts: Post[];
  error: Error | null;
}> {
  const mk = () =>
    postsQuery(selectedCity).order("created_at", { ascending: false }).limit(20);

  const r1 = await mk().or(
    "moderation_status.eq.active,moderation_status.is.null",
  );
  if (!r1.error) {
    return { posts: (r1.data ?? []) as Post[], error: null };
  }
  const r2 = await mk();
  return {
    posts: (r2.data ?? []) as Post[],
    error: r2.error ? new Error(String((r2.error as Error).message ?? r2.error)) : null,
  };
}

export async function fetchCommentsForPostIds(
  postIds: string[],
): Promise<{ rows: PostCommentRow[] | null; error: Error | null }> {
  if (postIds.length === 0) return { rows: [], error: null };
  const { data: commentsData, error: commentsErr } = await supabase
    .from("post_comments")
    .select(
      "id, post_id, author_id, body, created_at, author:profiles(full_name, role_title, last_seen_at)",
    )
    .in("post_id", postIds)
    .order("post_id", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(MAX_COMMENTS_FETCH);
  if (commentsErr)
    return { rows: null, error: new Error(String(commentsErr.message)) };
  return { rows: (commentsData ?? []) as PostCommentRow[], error: null };
}

export async function updatePostBody(postId: string, body: string) {
  return supabase
    .from("posts")
    .update({ body })
    .eq("id", postId)
    .select(POST_SELECT)
    .single();
}

export async function insertPost(payload: {
  authorId: string;
  body: string;
  city: string;
}) {
  return supabase
    .from("posts")
    .insert({
      author_id: payload.authorId,
      title: "Общий чат",
      body: payload.body,
      city: payload.city,
    })
    .select(POST_SELECT)
    .single();
}

export async function insertPostComment(payload: {
  postId: string;
  authorId: string;
  body: string;
}) {
  return supabase
    .from("post_comments")
    .insert({
      post_id: payload.postId,
      author_id: payload.authorId,
      body: payload.body,
    })
    .select(
      "id, post_id, author_id, body, created_at, author:profiles(full_name, role_title, last_seen_at)",
    )
    .single();
}
