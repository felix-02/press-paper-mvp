import { AppShell } from "@/components/shells/AppShell";
import { PageHeader, Panel, MetricCard } from "@/components/dashboard/Panels";
import { AUDIENCE_METRICS } from "@/data/analytics";
import { useInstitutionStats } from "@/lib/useInstitutionStats";
import { useAuth } from "@/auth/AuthProvider";
import { formatCount } from "@/lib/releaseMap";

export function Audience() {
  const { configured } = useAuth();
  const stats = useInstitutionStats();
  const showReal = configured;
  const avgViews = stats.releaseCount ? Math.round(stats.totalViews / stats.releaseCount) : 0;

  const metrics = showReal
    ? [
        { label: "Total Followers", value: formatCount(stats.followers), delta: "all time", positive: true, seriesSeed: 3, color: "var(--series-1)" },
        { label: "Releases", value: String(stats.releaseCount), delta: `${stats.publishedCount} published`, positive: true, seriesSeed: 7, color: "var(--series-2)" },
        { label: "Total Views", value: formatCount(stats.totalViews), delta: "all time", positive: true, seriesSeed: 11, color: "var(--series-3)" },
        { label: "Comments", value: formatCount(stats.totalComments), delta: "all time", positive: true, seriesSeed: 15, color: "var(--series-4)" },
        { label: "Avg. Views / Release", value: formatCount(avgViews), delta: "across all", positive: true, seriesSeed: 19, color: "var(--series-5)" },
      ]
    : AUDIENCE_METRICS;

  return (
    <AppShell kind="institution">
      <PageHeader title="Audience" subtitle="Who follows your organisation and how engaged they are." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 18 }}>
        {metrics.map((m) => (
          <MetricCard key={m.label} metric={m} rising={m.label === "Total Followers"} />
        ))}
      </div>

      <Panel title="Audience insights">
        <div style={{ padding: "18px 4px", color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.65, maxWidth: 580 }}>
          {showReal ? (
            <>
              Presspaper reports only what it can actually measure. Your real follower count, releases, views and comments are shown above and update as people engage with your releases.
              <br />
              <br />
              Detailed demographics — viewer location, age, gender and device — aren't collected, so we don't show estimated breakdowns. This keeps every number on your dashboard truthful rather than guessed.
            </>
          ) : (
            <>This is a demo workspace. Connect a live institution account to see your real follower count and engagement here.</>
          )}
        </div>
      </Panel>
    </AppShell>
  );
}
