export type Changelog = {
  id: string;
  organization_id: string;
  title: string;
  body: string;
  version: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};
