"use client";

import { useState } from "react";
import type { OrganizationInvitation } from "@/domain/entities/organization-invitation";
import { createClient } from "@/lib/supabase/client";

type TeamInvitationsPanelProps = {
  organizationId: string;
  initialInvitations: OrganizationInvitation[];
};

type CreatedInvitation = Omit<OrganizationInvitation, "organization_id"> & {
  invitation_id?: string;
  org_id?: string;
  invited_org_id?: string;
  invited_email?: string;
  invited_role?: "admin" | "member";
  invite_status?: OrganizationInvitation["status"];
  invite_expires_at?: string;
  invite_accepted_at?: string | null;
  invite_created_at?: string;
  organization_id?: string;
  token: string;
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function inviteUrl(token: string): string {
  return `${window.location.origin}/invite/${token}`;
}

async function copyInviteLink(token: string) {
  await navigator.clipboard.writeText(inviteUrl(token));
}

function getInviteError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("duplicate") || lower.includes("unique")) {
    return "A pending invitation already exists for this email.";
  }

  if (lower.includes("email")) {
    return "Enter a valid invite email.";
  }

  return message;
}

export function TeamInvitationsPanel({
  organizationId,
  initialInvitations,
}: TeamInvitationsPanelProps) {
  const [invitations, setInvitations] = useState(initialInvitations);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [copyableTokens, setCopyableTokens] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function createInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    setCreating(true);

    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc(
      "create_organization_invitation",
      {
        org_id: organizationId,
        invite_email: email.trim(),
        invite_role: role,
      }
    );

    setCreating(false);

    if (rpcError) {
      setError(getInviteError(rpcError.message));
      return;
    }

    const created = (Array.isArray(data) ? data[0] : data) as
      | CreatedInvitation
      | undefined;

    if (!created) return;

    const invitation = {
      ...created,
      id: created.id ?? created.invitation_id,
      organization_id:
        created.organization_id ??
        created.org_id ??
        created.invited_org_id ??
        organizationId,
      email: created.email ?? created.invited_email,
      role: created.role ?? created.invited_role,
      status: created.status ?? created.invite_status,
      expires_at: created.expires_at ?? created.invite_expires_at,
      accepted_at: created.accepted_at ?? created.invite_accepted_at ?? null,
      created_at: created.created_at ?? created.invite_created_at,
    } as OrganizationInvitation;

    setInvitations((current) => {
      const next = current.filter((item) => item.id !== invitation.id);
      return [invitation, ...next];
    });
    setCopyableTokens((current) => ({ ...current, [created.id]: created.token }));
    await copyInviteLink(created.token);
    setNotice("Invite link copied. Share it with the teammate.");
    setEmail("");
    setRole("member");
  }

  async function rotateToken(invitationId: string) {
    setError(null);
    setNotice(null);
    setBusyId(invitationId);

    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc(
      "rotate_organization_invitation_token",
      { invitation_id: invitationId }
    );

    setBusyId(null);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    const token = typeof row === "string" ? row : row?.token;

    if (!token) return;

    setCopyableTokens((current) => ({ ...current, [invitationId]: token }));
    await copyInviteLink(token);
    setNotice("Fresh invite link copied.");
  }

  async function revokeInvitation(invitationId: string) {
    setError(null);
    setNotice(null);
    setBusyId(invitationId);

    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc(
      "revoke_organization_invitation",
      { invitation_id: invitationId }
    );

    setBusyId(null);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setInvitations((current) =>
      current.map((item) =>
        item.id === invitationId ? { ...item, status: "revoked" } : item
      )
    );
    setNotice("Invitation revoked.");
  }

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm shadow-zinc-200/70 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/20">
      <div className="border-b border-zinc-200 bg-zinc-50/70 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-base font-semibold tracking-tight">Team invitations</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Invite teammates with copyable links. Email delivery can be wired later.
        </p>
      </div>

      <div className="flex flex-col gap-4 p-5">
        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            {notice}
          </p>
        ) : null}

        <form
          onSubmit={createInvitation}
          className="grid gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:grid-cols-[minmax(0,1fr)_8rem_auto]"
        >
          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              placeholder="teammate@example.com"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Role
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as "admin" | "member")}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-lg bg-zinc-950 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {creating ? "Creating..." : "Create invite"}
            </button>
          </div>
        </form>

        {invitations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              No invitations yet.
            </p>
            <p className="mt-1 leading-6 text-zinc-500">
              Create an invite link when a teammate needs access.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {invitations.map((invitation) => {
              const isPending = invitation.status === "pending";
              const token = copyableTokens[invitation.id];

              return (
                <li
                  key={invitation.id}
                  className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{invitation.email}</p>
                        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                          {invitation.role}
                        </span>
                        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                          {invitation.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        Expires {formatDate(invitation.expires_at)}
                      </p>
                      {token ? (
                        <p className="mt-2 break-all font-mono text-xs text-zinc-500">
                          {inviteUrl(token)}
                        </p>
                      ) : null}
                    </div>
                    {isPending ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busyId === invitation.id}
                          onClick={() => rotateToken(invitation.id)}
                          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
                        >
                          {busyId === invitation.id ? "Copying..." : "Copy link"}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === invitation.id}
                          onClick={() => revokeInvitation(invitation.id)}
                          className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-zinc-950 dark:text-red-300 dark:hover:bg-red-950/40"
                        >
                          Revoke
                        </button>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
