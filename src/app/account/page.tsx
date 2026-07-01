import { redirect } from "next/navigation";
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

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Your profile is loaded from public.profiles through RLS.
        </p>
      </div>

      <ProfileForm
        email={user.email ?? "Unknown email"}
        initialProfile={profile as Profile | null}
        profileError={profileError?.message ?? null}
      />
    </main>
  );
}
