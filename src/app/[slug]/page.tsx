import Link from "next/link";
import { notFound } from "next/navigation";
import { ChangelogSection } from "@/components/public/changelog-section";
import { FeatureRequestsSection } from "@/components/public/feature-requests-section";
import { ProductHero } from "@/components/public/product-hero";
import { RoadmapSection } from "@/components/public/roadmap-section";
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
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-14 px-6 py-10 sm:px-8 sm:py-12">
      <ProductHero name={org.name} slug={org.slug} />

      <WaitlistForm organizationId={org.id} />

      <RoadmapSection items={roadmap} />

      <FeatureRequestsSection
        organizationId={org.id}
        slug={org.slug}
        initialFeatures={features}
        initialVoteCounts={voteCounts}
        initialUserVotedIds={userVotedIds}
        userId={user?.id ?? null}
      />

      <ChangelogSection entries={publishedChangelogs} />

      <footer className="border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <Link
          href={`/${org.slug}/admin`}
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Admin dashboard →
        </Link>
      </footer>
    </main>
  );
}
