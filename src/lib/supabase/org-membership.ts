export type OrgMemberRole = "owner" | "admin" | "member";

export function isOrgAdminRole(role: string | undefined | null): boolean {
  return role === "owner" || role === "admin";
}
