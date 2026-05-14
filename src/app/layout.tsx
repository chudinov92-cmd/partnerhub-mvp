import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ConditionalTopBar } from "@/components/ConditionalTopBar";
import { PushBootstrap } from "@/components/PushBootstrap";
import { SelectedCityProvider } from "@/contexts/SelectedCityContext";
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
      <body className="font-sans antialiased text-slate-900">
        <PushBootstrap />
        <SelectedCityProvider>
          <div className="flex min-h-screen flex-col bg-gray-100" style={{ minHeight: '100dvh' }}>
            <ConditionalTopBar />
            <div className="flex-1">{children}</div>
          </div>
        </SelectedCityProvider>
      </body>
    </html>
  );
}
