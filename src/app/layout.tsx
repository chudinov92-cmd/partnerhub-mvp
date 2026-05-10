import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConditionalTopBar } from "@/components/ConditionalTopBar";
import { PushBootstrap } from "@/components/PushBootstrap";
import { SelectedCityProvider } from "@/contexts/SelectedCityContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zeip",
  description: "Zeip — платформа для поиска партнеров и команд по городам.",
  manifest: "/manifest.webmanifest",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased text-slate-900`}
      >
        <PushBootstrap />
        <SelectedCityProvider>
          <div className="flex min-h-screen flex-col bg-gray-100">
            <ConditionalTopBar />
            <div className="flex-1">{children}</div>
          </div>
        </SelectedCityProvider>
      </body>
    </html>
  );
}
