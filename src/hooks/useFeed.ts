"use client";

import { useEffect, useRef, useState } from "react";
import type { PostCommentRow } from "@/components/PostComments";
import {
  fetchCommentsForPostIds,
  fetchPostsForCity,
} from "@/services/feedService";
import { POSTS_POLL_INTERVAL_MS } from "@/services/constants";
import type { Post } from "@/types";

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

/** Посты общего чата по городу + поллинг + комментарии. */
export function useFeed(selectedCity: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [commentsByPostId, setCommentsByPostId] = useState<
    Record<string, PostCommentRow[]>
  >({});
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsLoadError, setPostsLoadError] = useState<string | null>(null);
  const postsFingerprintRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;
    setPostsLoading(true);
    setPostsLoadError(null);

    (async () => {
      const { posts: postsData, error: postsError } =
        await fetchPostsForCity(selectedCity);

      if (cancelled) return;

      if (postsError || !postsData) {
        console.warn("posts load failed", postsError);
        setPosts([]);
        setCommentsByPostId({});
        setPostsLoadError(
          postsError
            ? `Не удалось загрузить общий чат. ${postsError.message}`
            : "Не удалось загрузить общий чат.",
        );
        setPostsLoading(false);
        return;
      }

      setPosts(postsData);
      const postIds = postsData.map((p) => p.id);
      postsFingerprintRef.current = postIds.join("|");
      if (postIds.length > 0) {
        const { rows: commentsData, error: commentsErr } =
          await fetchCommentsForPostIds(postIds);
        if (cancelled) return;
        if (commentsErr) {
          console.warn("post_comments load failed", commentsErr);
          setCommentsByPostId({});
        } else if (commentsData) {
          setCommentsByPostId(groupCommentsByPostId(commentsData));
        }
      } else {
        setCommentsByPostId({});
      }
      setPostsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedCity]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const { posts: data, error } = await fetchPostsForCity(selectedCity);

      if (!error && data) {
        const nextPosts = data;
        const ids = nextPosts.map((p) => p.id);
        const nextFingerprint = ids.join("|");
        if (nextFingerprint === postsFingerprintRef.current) return;
        postsFingerprintRef.current = nextFingerprint;
        setPosts(nextPosts);
        if (ids.length === 0) {
          setCommentsByPostId({});
          return;
        }
        const { rows: cdata, error: cerr } = await fetchCommentsForPostIds(ids);
        if (!cerr && cdata) {
          setCommentsByPostId(groupCommentsByPostId(cdata));
        }
      }
    }, POSTS_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [selectedCity]);

  return {
    posts,
    setPosts,
    commentsByPostId,
    setCommentsByPostId,
    postsLoading,
    postsLoadError,
    postsFingerprintRef,
  };
}
