import { HomeLanding } from "@/app/landing/pages/HomeLanding";
import { fetchPublicStats } from "@/services/statsPublicService";

export default async function HomePage() {
  const stats = await fetchPublicStats();
  return <HomeLanding stats={stats} />;
}
