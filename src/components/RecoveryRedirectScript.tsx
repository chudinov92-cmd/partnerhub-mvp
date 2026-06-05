/**
 * Синхронный редирект до React/Supabase: PKCE после письма часто попадает на `/` с ?code=.
 */
export function RecoveryRedirectScript() {
  const script = `
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

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  );
}
