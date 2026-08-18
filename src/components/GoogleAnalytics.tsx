"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { hasCookieConsentAccepted, COOKIE_CONSENT_ACCEPTED_EVENT } from "@/lib/cookieConsent";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function GoogleAnalytics() {
  const [consentGranted, setConsentGranted] = useState(false);

  useEffect(() => {
    const activate = () => {
      if (!hasCookieConsentAccepted()) return;
      setConsentGranted(true);
    };

    activate();
    window.addEventListener(COOKIE_CONSENT_ACCEPTED_EVENT, activate);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_ACCEPTED_EVENT, activate);
    };
  }, []);

  if (!consentGranted || !GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            page_path: window.location.pathname,
            anonymize_ip: false,
          });
        `}
      </Script>
    </>
  );
}

export function trackGAEvent(
  eventName: string,
  params?: Record<string, unknown>
) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", eventName, params);
}
