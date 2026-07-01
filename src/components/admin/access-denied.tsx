import Link from "next/link";
import { LogOutButton } from "@/components/admin/log-out-button";

type AccessDeniedProps = {
  slug: string;
  orgName: string;
  email: string;
  role: string | null;
};

function getRoleMessage(role: string | null): string {
  if (role === "member") {
    return "You are a member of this organization, but admin access requires an owner or admin role.";
  }

  if (role) {
    return `Your role (${role}) does not include admin access for this organization.`;
  }

  return "This account is not a member of this organization, so admin data is blocked by RLS.";
}

export function AccessDenied({ slug, orgName, email, role }: AccessDeniedProps) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-zinc-500">/{slug}/admin</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {orgName} — Admin
        </h1>
      </header>

      <div
        role="alert"
        className="rounded-lg border-2 border-amber-300 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
          Access denied — logged in, not admin
        </p>
        <h2 className="mt-2 text-xl font-semibold text-amber-900 dark:text-amber-100">
          You cannot open this admin dashboard
        </h2>
        <p className="mt-3 text-sm text-amber-900 dark:text-amber-100">
          Signed in as <span className="font-medium">{email}</span>.
        </p>
        <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
          {getRoleMessage(role)}
        </p>
        <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
          Security is enforced by Supabase RLS on{" "}
          <code className="text-xs">organization_members</code>, not by hiding
          buttons alone.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/${slug}`}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Back to public page
          </Link>
          <LogOutButton />
        </div>
      </div>
    </main>
  );
}
