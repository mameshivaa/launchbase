import { redirect } from "next/navigation";
import { AcceptInvitationPanel } from "@/components/invite/accept-invitation-panel";
import { createClient } from "@/lib/supabase/server";

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/invite/${token}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <AcceptInvitationPanel token={token} email={user.email ?? "Unknown email"} />
    </main>
  );
}
