import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { CSP_NONCE_HEADER } from "@/lib/csp";
import { SCHEMA_ORG_JSON_LD, SITE_URL } from "@/lib/inlineScripts";
import { AuthRecoveryUrlHandler } from "@/components/AuthRecoveryUrlHandler";
import { AuthSessionKeeper } from "@/components/AuthSessionKeeper";
import { RecoveryRedirectScript } from "@/components/RecoveryRedirectScript";
import { ConditionalTopBar } from "@/components/ConditionalTopBar";
import { PushBootstrap } from "@/components/PushBootstrap";
import { SessionExpiredToast } from "@/components/SessionExpiredToast";
import { CookieBanner } from "@/components/CookieBanner";
import { YandexMetrika } from "@/components/YandexMetrika";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { VkPixel } from "@/components/VkPixel";
import { SelectedCityProvider } from "@/contexts/SelectedCityContext";

const OG_IMAGE = `${SITE_URL}/assets/landing/og-image.jpg`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Zeip — карта людей, готовых делать проекты вместе",
    template: "%s | Zeip",
  },
  description:
    "Zeip — карта людей в твоём городе, готовых вместе делать бизнес-проекты. Найди партнёра, единомышленника или команду рядом. Выйди из круга «дом–работа».",
  keywords: [
    "найти партнёра для бизнеса",
    "поиск партнёра",
    "единомышленники",
    "бизнес-партнёр",
    "карта предпринимателей",
    "стартап партнёр",
    "найти команду",
    "zeip",
    "зеип",
    "зеип.ру",
    "зеип карта",
    "zeip.ru",
  ],
  authors: [{ name: "Zeip", url: SITE_URL }],
  creator: "Zeip",
  publisher: "Zeip",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: SITE_URL,
    siteName: "Zeip",
    title: "Zeip — карта людей, готовых делать проекты вместе",
    description:
      "Карта людей в твоём городе, готовых вместе делать бизнес-проекты. Найди партнёра или команду рядом — и дело пойдёт.",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Zeip — карта людей, готовых делать проекты",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zeip — карта людей, готовых делать проекты вместе",
    description:
      "Карта людей в твоём городе, готовых вместе делать бизнес-проекты.",
    images: [OG_IMAGE],
    site: "@zeip_ru",
  },
  verification: {
    google:
      process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
      "EntKrnYAZF1oNe-u47VwT6SDbTozliWaq8Go6QDRSpY",
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
  },
  alternates: {
    canonical: SITE_URL,
    languages: { "ru-RU": SITE_URL },
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/zeip-logo.svg", type: "image/svg+xml" }],
    shortcut: "/zeip-logo.svg",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Zeip",
  },
};

export const viewport: Viewport = {
  themeColor: "#009966",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** CSP nonce per-request: иначе static HTML без nonce + strict-dynamic блокирует React. */
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get(CSP_NONCE_HEADER) ?? undefined;

  return (
    <html lang="ru">
      <head>
        <script
          id="schema-org"
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: SCHEMA_ORG_JSON_LD }}
        />
      </head>
      <body className="font-sans antialiased text-slate-900">
        <RecoveryRedirectScript nonce={nonce} />
        <PushBootstrap />
        <AuthRecoveryUrlHandler />
        <AuthSessionKeeper />
        <SelectedCityProvider>
          <div className="flex min-h-screen flex-col bg-gray-100" style={{ minHeight: '100dvh' }}>
            <ConditionalTopBar />
            <div className="flex-1">{children}</div>
            <SessionExpiredToast />
            <CookieBanner />
            <YandexMetrika />
            <GoogleAnalytics />
            <VkPixel />
          </div>
        </SelectedCityProvider>
      </body>
    </html>
  );
}
