export type WaitlistEntry = {
  id: string;
  organization_id: string;
  email: string;
  name: string | null;
  source: string | null;
  status: "pending" | "invited" | "converted";
  created_at: string;
  updated_at: string;
};

export const WAITLIST_STATUSES = [
  "pending",
  "invited",
  "converted",
] as const;

export type WaitlistStatus = (typeof WAITLIST_STATUSES)[number];
