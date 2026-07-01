import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccessDenied } from "@/components/admin/access-denied";
import { ChangelogPanel } from "@/components/admin/changelog-panel";
import { WaitlistPanel } from "@/components/admin/waitlist-panel";
import type { Changelog } from "@/domain/entities/changelog";
import type { WaitlistEntry } from "@/domain/entities/waitlist-entry";
import { resolveOrgAdminAccess } from "@/lib/supabase/org-admin-access";
import { createClient } from "@/lib/supabase/server";

type AdminPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AdminPage({ params }: AdminPageProps) {
  const { slug } = await params;
  const access = await resolveOrgAdminAccess(slug);

  // 1) Logged out → send to login and return here after sign-in.
  if (access.kind === "unauthenticated") {
    redirect(`/login?next=/${slug}/admin`);
  }

  if (access.kind === "org-not-found") {
    notFound();
  }

  // 2) Logged in but not owner/admin → explicit access denied page.
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

  // 3) Owner/admin → load admin data through RLS.
  const supabase = await createClient();
  const { org, user, role } = access;

  const [{ data: waitlistEntries }, { data: changelogs }] = await Promise.all([
    supabase
      .from("waitlist_entries")
      .select(
        "id, organization_id, email, name, source, status, created_at, updated_at"
      )
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("changelogs")
      .select(
        "id, organization_id, title, body, version, published_at, created_at, updated_at"
      )
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-zinc-500">/{org.slug}/admin</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {org.name} — Admin
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Signed in as {user.email} ({role}). Data loads through RLS as org
          admin.
        </p>
        <Link
          href={`/${org.slug}`}
          className="text-sm font-medium underline"
        >
          View public page
        </Link>
      </header>

      <WaitlistPanel initialEntries={(waitlistEntries ?? []) as WaitlistEntry[]} />
      <ChangelogPanel initialChangelogs={(changelogs ?? []) as Changelog[]} />
    </main>
  );
}
