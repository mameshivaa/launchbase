import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateWorkspaceForm } from "@/components/account/create-workspace-form";
import { ProfileForm } from "@/components/account/profile-form";
import type { Profile } from "@/domain/entities/profile";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  const { data: demoOrg } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", "launchbase-demo")
    .maybeSingle();

  const { data: membership } = demoOrg
    ? await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", demoOrg.id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const role = membership?.role ?? null;
  const canOpenAdmin = role === "owner" || role === "admin";
  const { data: memberships } = await supabase
    .from("organization_members")
    .select("role, organizations(id, name, slug)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const workspaces =
    memberships?.flatMap((item) => {
      const organization = Array.isArray(item.organizations)
        ? item.organizations[0]
        : item.organizations;

      return organization
        ? [
            {
              role: item.role,
              organization,
            },
          ]
        : [];
    }) ?? [];

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(22rem,0.75fr)] lg:px-8">
      <div className="flex flex-col gap-6">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-200/60 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#299764]">
            Signed-in workspace
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Account
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            This profile proves Supabase Auth and RLS are working. From here,
            continue into the public launch page or the admin operating
            dashboard.
          </p>
        </section>

        <ProfileForm
          email={user.email ?? "Unknown email"}
          initialProfile={profile as Profile | null}
          profileError={profileError?.message ?? null}
        />

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/60 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/20">
          <h2 className="text-base font-semibold tracking-tight">
            Your workspaces
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Open the public launch page or admin dashboard for each organization
            where you are a member.
          </p>

          {workspaces.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                No workspaces yet.
              </p>
              <p className="mt-1 text-zinc-500">
                Create one to unlock an owner dashboard without local SQL.
              </p>
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {workspaces.map(({ organization, role }) => (
                <li
                  key={organization.id}
                  className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold">{organization.name}</p>
                    <p className="mt-1 font-mono text-xs text-zinc-500">
                      /{organization.slug} · {role}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/${organization.slug}`}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
                    >
                      Public page
                    </Link>
                    <Link
                      href={`/${organization.slug}/admin`}
                      className="rounded-lg bg-zinc-950 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
                    >
                      Admin
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="flex flex-col gap-4">
        <CreateWorkspaceForm />

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/60 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/20">
          <h2 className="text-base font-semibold tracking-tight">
            Continue the demo
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Account setup is only step one. Use these routes to inspect the
            customer-facing page and the internal operating dashboard.
          </p>

          <div className="mt-5 flex flex-col gap-3">
            <Link
              href="/launchbase-demo"
              className="rounded-xl bg-[#3ecf8e] px-4 py-3 text-sm font-semibold text-zinc-950 shadow-sm transition-colors hover:bg-[#34b978]"
            >
              Open public launch page
            </Link>
            <Link
              href="/launchbase-demo/admin"
              className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              Open admin dashboard
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold tracking-tight">
              Demo admin access
            </h2>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                canOpenAdmin
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                  : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
              }`}
            >
              {canOpenAdmin ? role : "not admin"}
            </span>
          </div>

          {canOpenAdmin ? (
            <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              This user can open the admin dashboard for{" "}
              <span className="font-mono">/launchbase-demo</span>.
            </p>
          ) : (
            <div className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              <p>
                To unlock the admin dashboard in a local demo, make this profile
                an owner with the bootstrap SQL.
              </p>
              {profile ? (
                <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Profile ID to copy
                  </p>
                  <p className="mt-2 break-all font-mono text-xs text-zinc-700 dark:text-zinc-300">
                    {profile.id}
                  </p>
                </div>
              ) : null}
              <p className="mt-3">
                Edit{" "}
                <span className="font-mono text-zinc-800 dark:text-zinc-200">
                  scripts/local/bootstrap-admin.sql
                </span>
                , run it in Supabase Studio, then return to the admin dashboard.
              </p>
            </div>
          )}
        </section>
      </aside>
    </main>
  );
}
