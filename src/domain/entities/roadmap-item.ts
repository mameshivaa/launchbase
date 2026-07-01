export type RoadmapItem = {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  status: "planned" | "in_progress" | "done" | "cancelled";
  sort_order: number;
  target_date: string | null;
  feature_request_id: string | null;
  created_at: string;
  updated_at: string;
};
