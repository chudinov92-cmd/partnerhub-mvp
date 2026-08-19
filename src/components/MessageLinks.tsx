"use client";

import Link from "next/link";
import { useCallback } from "react";
import { splitMessageWithLinks } from "@/lib/linkifyMessage";
import { isZeipProfileUrl, parseZeipProfileLink } from "@/lib/profileShare";
import { supabasePublic } from "@/lib/supabaseClient";

export type MessageLinksProps = {
  content: string;
  isOwn: boolean;
  /** На карте: открыть попап профиля без перехода. */
  onOpenProfile?: (profileId: string) => void | Promise<void>;
};

export function MessageLinks({ content, isOwn, onOpenProfile }: MessageLinksProps) {
  const parts = splitMessageWithLinks(content);

  const handleZeipClick = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (!onOpenProfile) return;

      const ref = parseZeipProfileLink(href);
      if (!ref) return;

      e.preventDefault();

      let profileId: string | null = null;
      if (ref.kind === "profile_id") {
        profileId = ref.profileId;
      } else {
        const { data, error } = await supabasePublic.rpc(
          "resolve_profile_share_code",
          { p_code: ref.code },
        );
        if (error || !data) return;
        profileId = String(data);
      }

      if (profileId) {
        await onOpenProfile(profileId);
      }
    },
    [onOpenProfile],
  );

  const linkClass = isOwn
    ? "break-all underline underline-offset-2 text-white hover:text-white/90"
    : "break-all underline underline-offset-2 text-emerald-700 hover:text-emerald-800";

  return (
    <p className="whitespace-pre-wrap break-words">
      {parts.map((part, index) => {
        if (part.type === "text") {
          return <span key={index}>{part.value}</span>;
        }

        const zeip = isZeipProfileUrl(part.href);

        if (zeip && onOpenProfile) {
          return (
            <a
              key={index}
              href={part.href}
              className={linkClass}
              onClick={(e) => void handleZeipClick(e, part.href)}
            >
              {part.value}
            </a>
          );
        }

        if (zeip) {
          return (
            <Link key={index} href={part.href} className={linkClass}>
              {part.value}
            </Link>
          );
        }

        return (
          <a
            key={index}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            {part.value}
          </a>
        );
      })}
    </p>
  );
}
