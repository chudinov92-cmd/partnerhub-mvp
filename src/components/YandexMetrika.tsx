"use client";

import { useEffect, useState } from "react";
import { hasCookieConsentAccepted, COOKIE_CONSENT_ACCEPTED_EVENT } from "@/lib/cookieConsent";
import { initYandexMetrika, YANDEX_METRIKA_ID } from "@/lib/yandexMetrika";

export function YandexMetrika() {
  const [consentGranted, setConsentGranted] = useState(false);

  useEffect(() => {
    const activate = () => {
      if (!hasCookieConsentAccepted()) return;
      setConsentGranted(true);
      initYandexMetrika();
    };

    activate();

    window.addEventListener(COOKIE_CONSENT_ACCEPTED_EVENT, activate);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_ACCEPTED_EVENT, activate);
    };
  }, []);

  if (!consentGranted) return null;

  return (
    <noscript>
      <div>
        <img
          src={`https://mc.yandex.ru/watch/${YANDEX_METRIKA_ID}`}
          style={{ position: "absolute", left: "-9999px" }}
          alt=""
        />
      </div>
    </noscript>
  );
}
