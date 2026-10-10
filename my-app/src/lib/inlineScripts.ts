/** Единый источник inline-скриптов для CSP sha256-хешей и рендера в layout. */

export const SITE_URL = "https://zeip.ru";

const schemaOrgJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Zeip",
      alternateName: ["ЗЕИП", "Зеип", "зеип"],
      legalName: "ООО «ЗЕИП»",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/zeip-logo.svg`,
      },
      sameAs: [],
      description:
        "Zeip — карта людей в твоём городе, готовых вместе делать бизнес-проекты. Найди партнёра, единомышленника или команду рядом.",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Zeip",
      description:
        "Карта людей, готовых делать проекты вместе. Поиск бизнес-партнёров и команд по городам России.",
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "ru-RU",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/map?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

/** Тело `<script type="application/ld+json">` — должно совпадать 1:1 с HTML. */
export const SCHEMA_ORG_JSON_LD = JSON.stringify(schemaOrgJsonLd);

/**
 * Синхронный редирект recovery до React/Supabase.
 * Тело `<script>` — должно совпадать 1:1 с HTML (без nonce).
 */
export const RECOVERY_REDIRECT_SCRIPT_INLINE = `
(function(){
  try {
    var path = location.pathname;
    if (path === "/auth/reset-password") return;
    var search = location.search || "";
    var hash = location.hash || "";
    var need =
      search.indexOf("type=recovery") !== -1 ||
      hash.indexOf("type=recovery") !== -1;
    if (need) {
      location.replace("/auth/reset-password" + search + hash);
    }
  } catch (e) {}
})();
`;
