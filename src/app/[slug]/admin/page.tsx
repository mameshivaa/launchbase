import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccessDenied } from "@/components/admin/access-denied";
import { ChangelogPanel } from "@/components/admin/changelog-panel";
import { WaitlistPanel } from "@/components/admin/waitlist-panel";
import type { Changelog } from "@/domain/entities/changelog";
import type { FeatureRequest } from "@/domain/entities/feature-request";
import type { RoadmapItem } from "@/domain/entities/roadmap-item";
import type { WaitlistEntry } from "@/domain/entities/waitlist-entry";
import { buildVoteSummary } from "@/lib/public/feature-votes";
import { resolveOrgAdminAccess } from "@/lib/supabase/org-admin-access";
import { createClient } from "@/lib/supabase/server";

type AdminPageProps = {
  params: Promise<{ slug: string }>;
};

type MetricCardProps = {
  label: string;
  value: number;
  detail: string;
  tone: "emerald" | "amber" | "blue" | "violet" | "zinc";
};

const FEATURE_STATUS_ORDER: FeatureRequest["status"][] = [
  "open",
  "planned",
  "in_progress",
  "shipped",
  "closed",
];

const ROADMAP_STATUS_ORDER: RoadmapItem["status"][] = [
  "planned",
  "in_progress",
  "done",
  "cancelled",
];

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  invited: "Invited",
  converted: "Converted",
  open: "Open",
  planned: "Planned",
  in_progress: "In progress",
  shipped: "Shipped",
  closed: "Closed",
  done: "Done",
  cancelled: "Cancelled",
  draft: "Draft",
  published: "Published",
};

const STATUS_STYLES: Record<string, string> = {
  pending:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  invited:
    "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200",
  converted:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  open:
    "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
  planned:
    "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
  in_progress:
    "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200",
  shipped:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  done:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  closed:
    "border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400",
  cancelled:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
  draft:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  published:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
};

const METRIC_TONES: Record<MetricCardProps["tone"], string> = {
  emerald: "from-emerald-500/16 via-emerald-500/6 to-transparent",
  amber: "from-amber-500/18 via-amber-500/6 to-transparent",
  blue: "from-sky-500/16 via-sky-500/6 to-transparent",
  violet: "from-violet-500/16 via-violet-500/6 to-transparent",
  zinc: "from-zinc-500/12 via-zinc-500/5 to-transparent",
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusPill({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status.replaceAll("_", " ");
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.open;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${style}`}
    >
      {label}
    </span>
  );
}

function MetricCard({ label, value, detail, tone }: MetricCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/60 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/20 dark:hover:border-zinc-700">
      <div
        className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${METRIC_TONES[tone]}`}
      />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {label}
        </p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <p className="font-mono text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {value.toLocaleString()}
          </p>
          <span className="mb-1 h-2 w-2 rounded-full bg-zinc-900 shadow-[0_0_0_4px_rgba(24,24,27,0.08)] dark:bg-zinc-50 dark:shadow-[0_0_0_4px_rgba(250,250,250,0.08)]" />
        </div>
        <p className="mt-3 text-xs leading-5 text-zinc-500">{detail}</p>
      </div>
    </article>
  );
}

function OperationsPanel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm shadow-zinc-200/70 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/20">
      <div className="flex flex-col gap-3 border-b border-zinc-200 bg-zinc-50/70 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-7 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
      <p className="mt-1 max-w-xl leading-6 text-zinc-500">{description}</p>
    </div>
  );
}

function ProgressBar({
  value,
  max,
  tone = "bg-zinc-900 dark:bg-zinc-50",
}: {
  value: number;
  max: number;
  tone?: string;
}) {
  const width = max === 0 ? 0 : Math.max(5, Math.round((value / max) * 100));

  return (
    <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${width}%` }} />
    </div>
  );
}

function TopFeatureRequests({
  features,
  voteCounts,
}: {
  features: FeatureRequest[];
  voteCounts: Record<string, number>;
}) {
  const topFeatures = [...features]
    .sort((a, b) => {
      const voteDelta = (voteCounts[b.id] ?? 0) - (voteCounts[a.id] ?? 0);
      if (voteDelta !== 0) return voteDelta;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, 6);
  const maxVotes = Math.max(1, ...topFeatures.map((feature) => voteCounts[feature.id] ?? 0));

  if (topFeatures.length === 0) {
    return (
      <EmptyState
        title="No feature requests yet."
        description="Requests submitted from the public page will show up here with vote counts so you can decide what belongs on the roadmap."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {topFeatures.map((feature, index) => {
        const votes = voteCounts[feature.id] ?? 0;

        return (
          <article
            key={feature.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 font-mono text-sm font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                      {feature.title}
                    </h3>
                    <p className="mt-1 line-clamp-1 text-xs text-zinc-500">
                      {feature.submitter_email ?? "Signed-in user"} -{" "}
                      {formatDate(feature.created_at)}
                    </p>
                  </div>
                  <StatusPill status={feature.status} />
                </div>
                <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-3">
                  <ProgressBar
                    value={votes}
                    max={maxVotes}
                    tone="bg-gradient-to-r from-sky-500 to-emerald-500"
                  />
                  <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {votes}
                  </span>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function RoadmapStatusOverview({ items }: { items: RoadmapItem[] }) {
  const counts = ROADMAP_STATUS_ORDER.map((status) => ({
    status,
    count: items.filter((item) => item.status === status).length,
  }));
  const max = Math.max(1, ...counts.map((item) => item.count));

  if (items.length === 0) {
    return (
      <EmptyState
        title="No roadmap items yet."
        description="Promote the strongest requests into a short operating roadmap so customers can see what is planned, active, and shipped."
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {counts.map(({ status, count }) => (
        <div
          key={status}
          className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
        >
          <div className="flex items-center justify-between gap-3">
            <StatusPill status={status} />
            <span className="font-mono text-2xl font-semibold">{count}</span>
          </div>
          <div className="mt-4">
            <ProgressBar
              value={count}
              max={max}
              tone={
                status === "in_progress"
                  ? "bg-orange-500"
                  : status === "done"
                    ? "bg-emerald-500"
                    : status === "cancelled"
                      ? "bg-red-500"
                      : "bg-sky-500"
              }
            />
          </div>
          <p className="mt-3 text-xs leading-5 text-zinc-500">
            {status === "planned"
              ? "Committed but not started."
              : status === "in_progress"
                ? "Currently being built."
                : status === "done"
                  ? "Ready to connect to a changelog."
                  : "Removed from the active plan."}
          </p>
        </div>
      ))}
    </div>
  );
}

function ChangelogStatusOverview({ changelogs }: { changelogs: Changelog[] }) {
  const published = changelogs.filter((entry) => entry.published_at !== null);
  const drafts = changelogs.filter((entry) => entry.published_at === null);
  const latestPublished = published[0];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
        <StatusPill status="draft" />
        <p className="mt-3 font-mono text-3xl font-semibold">{drafts.length}</p>
        <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-200/80">
          Updates waiting to publish.
        </p>
      </div>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
        <StatusPill status="published" />
        <p className="mt-3 font-mono text-3xl font-semibold">
          {published.length}
        </p>
        <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-200/80">
          Visible on the public page.
        </p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Latest release
        </p>
        <p className="mt-3 truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          {latestPublished ? latestPublished.title : "Nothing published yet"}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {latestPublished?.published_at
            ? formatDate(latestPublished.published_at)
            : "Publish a draft when the first update ships."}
        </p>
      </div>
    </div>
  );
}

function FeatureStatusSummary({ features }: { features: FeatureRequest[] }) {
  if (features.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {FEATURE_STATUS_ORDER.map((status) => {
        const count = features.filter((feature) => feature.status === status)
          .length;

        return (
          <span
            key={status}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"
          >
            <StatusPill status={status} />
            <span className="font-mono">{count}</span>
          </span>
        );
      })}
    </div>
  );
}

function FocusQueue({
  pendingWaitlist,
  topFeature,
  topFeatureVotes,
  drafts,
  activeRoadmap,
}: {
  pendingWaitlist: number;
  topFeature: FeatureRequest | null;
  topFeatureVotes: number;
  drafts: number;
  activeRoadmap: number;
}) {
  const items = [
    {
      label: "Invite queue",
      value: `${pendingWaitlist} pending`,
      detail: "Review newest signups first",
      accent: "bg-amber-500",
    },
    {
      label: "Demand signal",
      value: topFeature ? `${topFeatureVotes} votes` : "No requests",
      detail: topFeature?.title ?? "Capture requests from the public board",
      accent: "bg-sky-500",
    },
    {
      label: "Roadmap motion",
      value: `${activeRoadmap} active`,
      detail: "Items currently planned or in progress",
      accent: "bg-orange-500",
    },
    {
      label: "Release queue",
      value: `${drafts} drafts`,
      detail: "Publish when a shipped change is ready",
      accent: "bg-emerald-500",
    },
  ];

  return (
    <section className="grid gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <article
          key={item.label}
          className="rounded-xl border border-white/10 bg-white/10 p-4 text-white shadow-sm backdrop-blur"
        >
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${item.accent}`} />
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
              {item.label}
            </p>
          </div>
          <p className="mt-3 font-mono text-2xl font-semibold">{item.value}</p>
          <p className="mt-1 line-clamp-1 text-xs text-zinc-400">
            {item.detail}
          </p>
        </article>
      ))}
    </section>
  );
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { slug } = await params;
  const access = await resolveOrgAdminAccess(slug);

  if (access.kind === "unauthenticated") {
    redirect(`/login?next=/${slug}/admin`);
  }

  if (access.kind === "org-not-found") {
    notFound();
  }

  if (access.kind === "forbidden") {
    return (
      <AccessDenied
        slug={access.org.slug}
        orgName={access.org.name}
        email={access.user.email ?? "Unknown email"}
        role={access.role}
      />
    );
  }

  const supabase = await createClient();
  const { org, user, role } = access;

  const [
    { data: waitlistEntries },
    { data: featureRequests },
    { data: roadmapItems },
    { data: changelogs },
  ] = await Promise.all([
    supabase
      .from("waitlist_entries")
      .select(
        "id, organization_id, email, name, source, status, created_at, updated_at"
      )
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("feature_requests")
      .select(
        "id, organization_id, title, description, status, created_by, submitter_email, created_at, updated_at"
      )
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("roadmap_items")
      .select(
        "id, organization_id, title, description, status, sort_order, target_date, feature_request_id, created_at, updated_at"
      )
      .eq("organization_id", org.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("changelogs")
      .select(
        "id, organization_id, title, body, version, published_at, created_at, updated_at"
      )
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false }),
  ]);

  const waitlist = (waitlistEntries ?? []) as WaitlistEntry[];
  const features = (featureRequests ?? []) as FeatureRequest[];
  const roadmap = (roadmapItems ?? []) as RoadmapItem[];
  const allChangelogs = (changelogs ?? []) as Changelog[];
  const featureIds = features.map((item) => item.id);

  let voteCounts: Record<string, number> = {};

  if (featureIds.length > 0) {
    const { data: votes } = await supabase
      .from("feature_votes")
      .select("feature_request_id, user_id")
      .in("feature_request_id", featureIds);

    ({ voteCounts } = buildVoteSummary(featureIds, votes, user.id));
  }

  const totalVotes = Object.values(voteCounts).reduce(
    (total, count) => total + count,
    0
  );
  const pendingWaitlist = waitlist.filter(
    (entry) => entry.status === "pending"
  ).length;
  const publishedChangelogs = allChangelogs.filter(
    (entry) => entry.published_at !== null
  ).length;
  const draftChangelogs = allChangelogs.length - publishedChangelogs;
  const activeRoadmap = roadmap.filter((item) =>
    ["planned", "in_progress"].includes(item.status)
  ).length;
  const topFeature =
    features.length === 0
      ? null
      : [...features].sort((a, b) => (voteCounts[b.id] ?? 0) - (voteCounts[a.id] ?? 0))[0];
  const topFeatureVotes = topFeature ? voteCounts[topFeature.id] ?? 0 : 0;

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-sm font-semibold text-white shadow-sm dark:bg-zinc-50 dark:text-zinc-950">
              LB
            </div>
            <div>
              <p className="text-sm font-semibold">LaunchBase</p>
              <p className="font-mono text-xs text-zinc-500">/{org.slug}/admin</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              {role}
            </span>
            <Link
              href={`/${org.slug}`}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              Public page
            </Link>
            <Link
              href={`/${org.slug}#feature-requests`}
              className="rounded-lg bg-zinc-950 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Review requests
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-xl shadow-zinc-300/40 dark:border-zinc-800 dark:shadow-black/30">
          <div className="border-b border-white/10 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                  Startup operating dashboard
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {org.name}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                  Run waitlist qualification, feature demand, roadmap movement,
                  and release communication from one launch command center.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Current operator
                </p>
                <p className="mt-2 max-w-[18rem] truncate font-medium text-white">
                  {user.email}
                </p>
                <p className="mt-1 font-mono text-xs text-zinc-500">
                  RLS enforced admin session
                </p>
              </div>
            </div>
          </div>
          <div className="p-5 sm:p-6">
            <FocusQueue
              pendingWaitlist={pendingWaitlist}
              topFeature={topFeature}
              topFeatureVotes={topFeatureVotes}
              drafts={draftChangelogs}
              activeRoadmap={activeRoadmap}
            />
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Waitlist"
            value={waitlist.length}
            detail="All captured launch signups."
            tone="emerald"
          />
          <MetricCard
            label="Pending"
            value={pendingWaitlist}
            detail="Need invite, qualification, or follow-up."
            tone="amber"
          />
          <MetricCard
            label="Feature requests"
            value={features.length}
            detail="Customer demand signals to review."
            tone="blue"
          />
          <MetricCard
            label="Votes"
            value={totalVotes}
            detail="Weighted signal across requests."
            tone="violet"
          />
          <MetricCard
            label="Published updates"
            value={publishedChangelogs}
            detail="Changelog entries visible publicly."
            tone="zinc"
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(24rem,0.82fr)]">
          <div className="flex flex-col gap-6">
            <WaitlistPanel initialEntries={waitlist.slice(0, 10)} />

            <OperationsPanel
              title="Top feature requests by votes"
              description="Use demand, recency, and status together to decide what should be planned, closed, or shipped next."
              action={<FeatureStatusSummary features={features} />}
            >
              <TopFeatureRequests features={features} voteCounts={voteCounts} />
            </OperationsPanel>
          </div>

          <div className="flex flex-col gap-6">
            <OperationsPanel
              title="Roadmap status overview"
              description="Keep the public roadmap compact, current, and credible."
              action={
                <Link
                  href={`/${org.slug}`}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                  View roadmap
                </Link>
              }
            >
              <RoadmapStatusOverview items={roadmap} />
            </OperationsPanel>

            <OperationsPanel
              title="Changelog publishing status"
              description="Separate draft release notes from entries already published to customers."
            >
              <ChangelogStatusOverview changelogs={allChangelogs} />
            </OperationsPanel>

            <ChangelogPanel initialChangelogs={allChangelogs.slice(0, 6)} />
          </div>
        </div>
      </div>
    </main>
  );
}
