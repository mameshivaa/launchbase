import type { LaunchActivityEvent } from "@/domain/entities/launch-activity-event";

type LaunchActivityPanelProps = {
  events: LaunchActivityEvent[];
};

const EVENT_LABELS: Record<string, string> = {
  waitlist_joined: "Waitlist joined",
  waitlist_status_changed: "Waitlist status changed",
  feature_request_created: "Feature request created",
  feature_request_triaged: "Feature request triaged",
  roadmap_item_created: "Roadmap item created",
  roadmap_status_changed: "Roadmap status changed",
  roadmap_item_deleted: "Roadmap item deleted",
  changelog_draft_created: "Changelog draft created",
  changelog_published: "Changelog published",
  team_invite_created: "Team invite created",
  team_invite_accepted: "Team invite accepted",
  team_invite_revoked: "Team invite revoked",
  team_invite_updated: "Team invite updated",
};

function formatActivityTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function metadataSummary(metadata: Record<string, unknown>): string | null {
  const from = typeof metadata.from === "string" ? metadata.from : null;
  const to = typeof metadata.to === "string" ? metadata.to : null;
  const status = typeof metadata.status === "string" ? metadata.status : null;
  const role = typeof metadata.role === "string" ? metadata.role : null;
  const version = typeof metadata.version === "string" ? metadata.version : null;

  if (from && to) {
    return `${from.replaceAll("_", " ")} -> ${to.replaceAll("_", " ")}`;
  }

  if (role && status) {
    return `${role} / ${status}`;
  }

  return version ?? status;
}

export function LaunchActivityPanel({ events }: LaunchActivityPanelProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm shadow-zinc-200/70 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/20">
      <div className="border-b border-zinc-200 bg-zinc-50/70 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Launch activity
            </h2>
            <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Database triggers record the operational timeline while RLS keeps
              it visible only to workspace admins.
            </p>
          </div>
          <span className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            Supabase Postgres + RLS
          </span>
        </div>
      </div>

      <div className="p-5">
        {events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-7 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
              No activity yet
            </p>
            <p className="mt-1 max-w-xl leading-6 text-zinc-500">
              Create an invite, update a waitlist lead, triage a request, or
              publish a changelog to populate this audit trail.
            </p>
          </div>
        ) : (
          <ol className="space-y-3">
            {events.map((event) => {
              const detail = metadataSummary(event.metadata);

              return (
                <li
                  key={event.id}
                  className="relative rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                        {EVENT_LABELS[event.event_type] ??
                          event.event_type.replaceAll("_", " ")}
                      </p>
                      <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-400">
                        {event.subject_label}
                      </p>
                    </div>
                    <time className="shrink-0 font-mono text-xs text-zinc-500">
                      {formatActivityTime(event.created_at)}
                    </time>
                  </div>

                  {detail ? (
                    <p className="mt-3 inline-flex rounded-md bg-zinc-100 px-2 py-1 font-mono text-[11px] text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                      {detail}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
