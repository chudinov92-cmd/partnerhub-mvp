"use client";

import Link from "next/link";
import { useCallback } from "react";
import { splitMessageWithLinks } from "../linkifyMessage";
import { isZeipProfileUrl, parseZeipProfileLink } from "../profileShare";

export type MessageLinksProps = {
  content: string;
  isOwn: boolean;
  /** На карте: открыть попап профиля без перехода. */
  onOpenProfile?: (profileId: string) => void | Promise<void>;
  /** Резолвинг короткого кода шаринга → profileId (инъекция из app). */
  resolveProfileCode?: (code: string) => Promise<string | null>;
};

export function MessageLinks({
  content,
  isOwn,
  onOpenProfile,
  resolveProfileCode,
}: MessageLinksProps) {
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
      } else if (resolveProfileCode) {
        profileId = await resolveProfileCode(ref.code);
        if (!profileId) return;
      } else {
        return;
      }

      if (profileId) {
        await onOpenProfile(profileId);
      }
    },
    [onOpenProfile, resolveProfileCode],
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