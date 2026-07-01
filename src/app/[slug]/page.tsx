import Link from "next/link";
import { notFound } from "next/navigation";
import { FeatureRequestsSection } from "@/components/public/feature-requests-section";
import { WaitlistForm } from "@/components/public/waitlist-form";
import type { Changelog } from "@/domain/entities/changelog";
import type { FeatureRequest } from "@/domain/entities/feature-request";
import type { Organization } from "@/domain/entities/organization";
import type { RoadmapItem } from "@/domain/entities/roadmap-item";
import { buildVoteSummary } from "@/lib/public/feature-votes";
import { createClient } from "@/lib/supabase/server";

type PublicOrgPageProps = {
  params: Promise<{ slug: string }>;
};

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      {label.replace("_", " ")}
    </span>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default async function PublicOrgPage({ params }: PublicOrgPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, slug, created_at, updated_at")
    .eq("slug", slug)
    .maybeSingle();

  if (orgError || !organization) {
    notFound();
  }

  const org = organization as Organization;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: roadmapItems },
    { data: featureRequests },
    { data: changelogs },
  ] = await Promise.all([
    supabase
      .from("roadmap_items")
      .select(
        "id, organization_id, title, description, status, sort_order, target_date, feature_request_id, created_at, updated_at"
      )
      .eq("organization_id", org.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("feature_requests")
      .select(
        "id, organization_id, title, description, status, created_by, submitter_email, created_at, updated_at"
      )
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("changelogs")
      .select(
        "id, organization_id, title, body, version, published_at, created_at, updated_at"
      )
      .eq("organization_id", org.id)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false }),
  ]);

  const roadmap = (roadmapItems ?? []) as RoadmapItem[];
  const features = (featureRequests ?? []) as FeatureRequest[];
  const publishedChangelogs = (changelogs ?? []) as Changelog[];

  const featureIds = features.map((item) => item.id);
  let voteCounts: Record<string, number> = {};
  let userVotedIds: string[] = [];

  if (featureIds.length > 0) {
    const { data: votes } = await supabase
      .from("feature_votes")
      .select("feature_request_id, user_id")
      .in("feature_request_id", featureIds);

    ({ voteCounts, userVotedIds } = buildVoteSummary(
      featureIds,
      votes,
      user?.id ?? null
    ));
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-zinc-500">/{org.slug}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{org.name}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Public product page — read-only data loaded through anon Supabase access
          and RLS.
        </p>
        <Link
          href={`/${org.slug}/admin`}
          className="text-sm font-medium underline"
        >
          Admin dashboard
        </Link>
      </header>

      <Section title="Roadmap" description="What we are building next.">
        {roadmap.length === 0 ? (
          <p className="text-sm text-zinc-500">No roadmap items yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {roadmap.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{item.title}</h3>
                  <StatusBadge label={item.status} />
                </div>
                {item.description ? (
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {item.description}
                  </p>
                ) : null}
                {item.target_date ? (
                  <p className="mt-2 text-xs text-zinc-500">
                    Target: {item.target_date}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <FeatureRequestsSection
        organizationId={org.id}
        slug={org.slug}
        initialFeatures={features}
        initialVoteCounts={voteCounts}
        initialUserVotedIds={userVotedIds}
        userId={user?.id ?? null}
      />

      <Section
        title="Changelog"
        description="Published release notes only (drafts are hidden)."
      >
        {publishedChangelogs.length === 0 ? (
          <p className="text-sm text-zinc-500">No published updates yet.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {publishedChangelogs.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{entry.title}</h3>
                  {entry.version ? (
                    <span className="text-xs text-zinc-500">v{entry.version}</span>
                  ) : null}
                </div>
                {entry.published_at ? (
                  <p className="mt-1 text-xs text-zinc-500">
                    {new Date(entry.published_at).toLocaleDateString()}
                  </p>
                ) : null}
                <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-zinc-600 dark:text-zinc-400">
                  {entry.body}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Join the waitlist"
        description="No account required — anyone can sign up."
      >
        <WaitlistForm organizationId={org.id} />
      </Section>
    </main>
  );
}
