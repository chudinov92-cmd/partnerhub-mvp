"use client";

import type { ComponentType } from "react";

type MobileMainTab = "chat" | "map" | "my-chats" | "contacts";

type MainMobileNavProps = {
  activeTab: MobileMainTab;
  onTabChange: (tab: MobileMainTab) => void;
  unreadChatsCount: number;
};

function IconMessageCircle({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 7.5 7.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function IconMap({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" x2="8" y1="2" y2="18" />
      <line x1="16" x2="16" y1="6" y2="22" />
    </svg>
  );
}

function IconUserPlus({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconMessagesSquare({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M13 8H7" />
      <path d="M17 12H7" />
    </svg>
  );
}

export function MainMobileNav({
  activeTab,
  onTabChange,
  unreadChatsCount,
}: MainMobileNavProps) {
  const tabs: {
    id: MobileMainTab;
    icon: ComponentType<{ className?: string }>;
    label: string;
    badge?: number;
  }[] = [
    { id: "chat", icon: IconMessageCircle, label: "Чат" },
    { id: "map", icon: IconMap, label: "Карта" },
    { id: "contacts", icon: IconUsers, label: "Контакты" },
    {
      id: "my-chats",
      icon: IconMessagesSquare,
      label: "Мои чаты",
      badge: unreadChatsCount,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[1400] border-t border-gray-200 bg-white shadow-lg lg:hidden"
      aria-label="Основная навигация"
    >
      <div className="flex h-14 items-stretch justify-around px-2">
        {tabs.map(({ id, icon: Icon, label, badge }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={`relative flex h-full flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-0 transition-all ${
              activeTab === id
                ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
                : "text-slate-600 hover:bg-gray-100"
            }`}
          >
            <span className="relative">
              <Icon className="h-5 w-5" />
              {badge !== undefined && badge > 0 ? (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {badge > 9 ? "9+" : badge}
                </span>
              ) : null}
            </span>
            <span className="text-[11px] font-medium leading-none">{label}</span>
          </button>
        ))}
      </div>
      <div
        className="bg-white"
        style={{ height: "env(safe-area-inset-bottom, 0px)" }}
        aria-hidden
      />
    </nav>
  );
}

export type { MobileMainTab };
