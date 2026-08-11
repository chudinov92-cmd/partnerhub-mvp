import {
  formatPublicProfileCount,
  type PublicStats,
} from "@/services/statsPublicService";

type StatsBarProps = {
  stats: PublicStats | null;
};

export function StatsBar({ stats }: StatsBarProps) {
  if (!stats) return null;

  const profileLabel = formatPublicProfileCount(stats.profileCount);
  if (!profileLabel) return null;

  return (
    <div className="border-b border-gray-100 bg-white py-3 text-center text-sm text-slate-600">
      <span className="font-semibold text-slate-900">{profileLabel}</span>{" "}
      участников
      {stats.cityCount >= 2 ? (
        <>
          {" "}
          ·{" "}
          <span className="font-semibold text-slate-900">{stats.cityCount}</span>{" "}
          {stats.cityCount === 1 ? "город" : stats.cityCount < 5 ? "города" : "городов"}{" "}
          России
        </>
      ) : null}
    </div>
  );
}
