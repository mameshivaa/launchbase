import type { User } from "@supabase/supabase-js";
import type { Organization } from "@/domain/entities/organization";
import { isOrgAdminRole } from "@/lib/supabase/org-membership";
import { createClient } from "@/lib/supabase/server";

export type OrgAdminAccessResult =
  | { kind: "unauthenticated" }
  | { kind: "org-not-found" }
  | {
      kind: "forbidden";
      user: User;
      org: Organization;
      role: string | null;
    }
  | {
      kind: "allowed";
      user: User;
      org: Organization;
      role: string;
    };

export async function resolveOrgAdminAccess(
  slug: string
): Promise<OrgAdminAccessResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { kind: "unauthenticated" };
  }

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, slug, created_at, updated_at")
    .eq("slug", slug)
    .maybeSingle();

  if (orgError || !organization) {
    return { kind: "org-not-found" };
  }

  const org = organization as Organization;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", org.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !isOrgAdminRole(membership.role)) {
    return {
      kind: "forbidden",
      user,
      org,
      role: membership?.role ?? null,
    };
  }

  return {
    kind: "allowed",
    user,
    org,
    role: membership.role,
  };
}
