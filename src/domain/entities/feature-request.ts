export type FeatureRequest = {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  status: "open" | "planned" | "in_progress" | "shipped" | "closed";
  created_by: string | null;
  submitter_email: string | null;
  created_at: string;
  updated_at: string;
};
