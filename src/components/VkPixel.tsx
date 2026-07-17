"use client";

import { useEffect, useState } from "react";
import {
  COOKIE_CONSENT_ACCEPTED_EVENT,
  hasCookieConsentAccepted,
} from "@/lib/cookieConsent";
import { initVkPixel, VK_PIXEL_ID } from "@/lib/vkPixel";

export function VkPixel() {
  const [consentGranted, setConsentGranted] = useState(false);

  useEffect(() => {
    const activate = () => {
      if (!hasCookieConsentAccepted()) return;
      setConsentGranted(true);
      initVkPixel();
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
          src={`https://top-fwz1.mail.ru/counter?id=${VK_PIXEL_ID};js=na`}
          style={{ position: "absolute", left: "-9999px" }}
          alt="Top.Mail.Ru"
        />
      </div>
    </noscript>
  );
}
