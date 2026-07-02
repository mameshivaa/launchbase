export type LaunchActivityEvent = {
  id: string;
  organization_id: string;
  actor_user_id: string | null;
  event_type: string;
  subject_type: string;
  subject_id: string | null;
  subject_label: string;
  metadata: Record<string, unknown>;
  created_at: string;
};
