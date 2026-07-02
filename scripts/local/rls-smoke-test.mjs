const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error(
    "Missing SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const runId = Date.now();
const ownerEmail = `rls-owner-${runId}@example.invalid`;
const invitedEmail = `rls-invited-${runId}@example.invalid`;
const outsiderEmail = `rls-outsider-${runId}@example.invalid`;
const waitlistEmail = `lead-${runId}@example.invalid`;
const password = "password123";
const slug = `rls-smoke-${runId}`;
const createdUsers = [];
let createdOrganizationId = null;

function headers(key, token = key) {
  return {
    apikey: key,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function request(path, options) {
  const response = await fetch(`${supabaseUrl}${path}`, options);
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { response, body };
}

async function assertOk(label, promise) {
  const result = await promise;
  if (!result.response.ok) {
    throw new Error(
      `${label} failed: ${result.response.status} ${JSON.stringify(result.body)}`
    );
  }
  console.log(`ok - ${label}`);
  return result.body;
}

async function assertBlocked(label, promise) {
  const result = await promise;
  if (result.response.ok) {
    throw new Error(
      `${label} unexpectedly succeeded: ${JSON.stringify(result.body)}`
    );
  }
  console.log(`ok - ${label} blocked (${result.response.status})`);
}

async function createAuthUser(label, email) {
  const user = await assertOk(
    label,
    request("/auth/v1/admin/users", {
      method: "POST",
      headers: headers(serviceRoleKey),
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: label },
      }),
    })
  );
  createdUsers.push(user.id);
  return user;
}

async function signIn(label, email) {
  return assertOk(
    label,
    request("/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: headers(anonKey),
      body: JSON.stringify({ email, password }),
    })
  );
}

function invitationId(row) {
  return row.id ?? row.invitation_id;
}

const ownerUser = await createAuthUser("create owner auth user", ownerEmail);
const invitedUser = await createAuthUser("create invited auth user", invitedEmail);
await createAuthUser("create outsider auth user", outsiderEmail);

try {
  const ownerSession = await signIn("sign in owner user", ownerEmail);
  const ownerAccessToken = ownerSession.access_token;
  const invitedSession = await signIn("sign in invited user", invitedEmail);
  const invitedAccessToken = invitedSession.access_token;
  const outsiderSession = await signIn("sign in outsider user", outsiderEmail);
  const outsiderAccessToken = outsiderSession.access_token;

  await assertBlocked(
    "anon cannot read invitations",
    request("/rest/v1/organization_invitations?select=id,email,token_hash", {
      headers: headers(anonKey),
    })
  );

  const organization = await assertOk(
    "authenticated user creates owned workspace",
    request("/rest/v1/rpc/create_organization", {
      method: "POST",
      headers: headers(anonKey, ownerAccessToken),
      body: JSON.stringify({ org_name: "RLS Smoke", org_slug: slug }),
    })
  );
  createdOrganizationId = organization.id;

  await assertBlocked(
    "non-admin cannot create invite",
    request("/rest/v1/rpc/create_organization_invitation", {
      method: "POST",
      headers: headers(anonKey, outsiderAccessToken),
      body: JSON.stringify({
        org_id: organization.id,
        invite_email: `blocked-${runId}@example.invalid`,
        invite_role: "member",
      }),
    })
  );

  const invite = (
    await assertOk(
      "admin can create invite",
      request("/rest/v1/rpc/create_organization_invitation", {
        method: "POST",
        headers: headers(anonKey, ownerAccessToken),
        body: JSON.stringify({
          org_id: organization.id,
          invite_email: invitedEmail,
          invite_role: "member",
        }),
      })
    )
  )[0];

  if (!invite.token) {
    throw new Error(`Expected invite token, got ${JSON.stringify(invite)}`);
  }

  await assertBlocked(
    "invite token cannot be accepted by mismatched email",
    request("/rest/v1/rpc/accept_organization_invitation", {
      method: "POST",
      headers: headers(anonKey, outsiderAccessToken),
      body: JSON.stringify({ raw_token: invite.token }),
    })
  );

  await assertOk(
    "matching user can accept invite",
    request("/rest/v1/rpc/accept_organization_invitation", {
      method: "POST",
      headers: headers(anonKey, invitedAccessToken),
      body: JSON.stringify({ raw_token: invite.token }),
    })
  );

  const invitedMembership = await assertOk(
    "accepting invite creates membership",
    request(
      `/rest/v1/organization_members?organization_id=eq.${organization.id}&user_id=eq.${invitedUser.id}&select=role`,
      { headers: headers(anonKey, invitedAccessToken) }
    )
  );

  if (invitedMembership.length !== 1 || invitedMembership[0].role !== "member") {
    throw new Error(
      `Expected one member membership, got ${JSON.stringify(invitedMembership)}`
    );
  }

  await assertOk(
    "anon can join waitlist before member update check",
    request("/rest/v1/waitlist_entries", {
      method: "POST",
      headers: { ...headers(anonKey), Prefer: "return=minimal" },
      body: JSON.stringify({
        organization_id: organization.id,
        email: waitlistEmail,
        name: "Smoke Lead",
        source: "rls_smoke",
      }),
    })
  );

  await assertOk(
    "member update attempt does not error",
    request(`/rest/v1/waitlist_entries?organization_id=eq.${organization.id}`, {
      method: "PATCH",
      headers: { ...headers(anonKey, invitedAccessToken), Prefer: "return=minimal" },
      body: JSON.stringify({ status: "invited" }),
    })
  );

  const waitlistAfterMemberUpdate = await assertOk(
    "member cannot change waitlist status",
    request(`/rest/v1/waitlist_entries?email=eq.${waitlistEmail}&select=status`, {
      headers: headers(anonKey, ownerAccessToken),
    })
  );

  if (waitlistAfterMemberUpdate[0]?.status !== "pending") {
    throw new Error(
      `Expected waitlist status to remain pending, got ${JSON.stringify(
        waitlistAfterMemberUpdate
      )}`
    );
  }

  const revokedInvite = (
    await assertOk(
      "admin can create second invite",
      request("/rest/v1/rpc/create_organization_invitation", {
        method: "POST",
        headers: headers(anonKey, ownerAccessToken),
        body: JSON.stringify({
          org_id: organization.id,
          invite_email: outsiderEmail,
          invite_role: "member",
        }),
      })
    )
  )[0];

  await assertOk(
    "admin can revoke invite",
    request("/rest/v1/rpc/revoke_organization_invitation", {
      method: "POST",
      headers: headers(anonKey, ownerAccessToken),
      body: JSON.stringify({ invitation_id: invitationId(revokedInvite) }),
    })
  );

  await assertBlocked(
    "revoked invite cannot be accepted",
    request("/rest/v1/rpc/accept_organization_invitation", {
      method: "POST",
      headers: headers(anonKey, outsiderAccessToken),
      body: JSON.stringify({ raw_token: revokedInvite.token }),
    })
  );

  const expiredInvite = (
    await assertOk(
      "admin can create expiring invite",
      request("/rest/v1/rpc/create_organization_invitation", {
        method: "POST",
        headers: headers(anonKey, ownerAccessToken),
        body: JSON.stringify({
          org_id: organization.id,
          invite_email: outsiderEmail,
          invite_role: "admin",
        }),
      })
    )
  )[0];

  await assertOk(
    "admin expires invite for smoke test",
    request(`/rest/v1/organization_invitations?id=eq.${invitationId(expiredInvite)}`, {
      method: "PATCH",
      headers: { ...headers(anonKey, ownerAccessToken), Prefer: "return=minimal" },
      body: JSON.stringify({ expires_at: "2000-01-01T00:00:00.000Z" }),
    })
  );

  await assertBlocked(
    "expired invite cannot be accepted",
    request("/rest/v1/rpc/accept_organization_invitation", {
      method: "POST",
      headers: headers(anonKey, outsiderAccessToken),
      body: JSON.stringify({ raw_token: expiredInvite.token }),
    })
  );

  const adminInvite = (
    await assertOk(
      "admin can create admin invite",
      request("/rest/v1/rpc/create_organization_invitation", {
        method: "POST",
        headers: headers(anonKey, ownerAccessToken),
        body: JSON.stringify({
          org_id: organization.id,
          invite_email: outsiderEmail,
          invite_role: "admin",
        }),
      })
    )
  )[0];

  await assertOk(
    "matching user can accept admin invite",
    request("/rest/v1/rpc/accept_organization_invitation", {
      method: "POST",
      headers: headers(anonKey, outsiderAccessToken),
      body: JSON.stringify({ raw_token: adminInvite.token }),
    })
  );

  await assertOk(
    "invited admin can create invite",
    request("/rest/v1/rpc/create_organization_invitation", {
      method: "POST",
      headers: headers(anonKey, outsiderAccessToken),
      body: JSON.stringify({
        org_id: organization.id,
        invite_email: `new-admin-created-${runId}@example.invalid`,
        invite_role: "member",
      }),
    })
  );

  const ownerMembership = await assertOk(
    "owner membership is visible to creator",
    request(
      `/rest/v1/organization_members?organization_id=eq.${organization.id}&user_id=eq.${ownerUser.id}&select=role`,
      {
        headers: headers(anonKey, ownerAccessToken),
      }
    )
  );

  if (ownerMembership[0]?.role !== "owner") {
    throw new Error(
      `Expected owner membership, got ${JSON.stringify(ownerMembership)}`
    );
  }

  await assertOk(
    "anon can join waitlist",
    request("/rest/v1/waitlist_entries", {
      method: "POST",
      headers: { ...headers(anonKey), Prefer: "return=minimal" },
      body: JSON.stringify({
        organization_id: organization.id,
        email: `lead-2-${runId}@example.invalid`,
        name: "Smoke Lead",
        source: "rls_smoke",
      }),
    })
  );

  await assertBlocked(
    "anon cannot read waitlist PII",
    request(`/rest/v1/waitlist_entries?organization_id=eq.${organization.id}&select=email`, {
      headers: headers(anonKey),
    })
  );

  await assertBlocked(
    "anon cannot read launch activity",
    request(
      `/rest/v1/launch_activity_events?organization_id=eq.${organization.id}&select=event_type,subject_label`,
      {
        headers: headers(anonKey),
      }
    )
  );

  const feature = (
    await assertOk(
      "authenticated user submits feature request",
      request("/rest/v1/feature_requests", {
        method: "POST",
        headers: { ...headers(anonKey, ownerAccessToken), Prefer: "return=representation" },
        body: JSON.stringify({
          organization_id: organization.id,
          title: "RLS smoke feature",
          created_by: ownerUser.id,
        }),
      })
    )
  )[0];

  await assertOk(
    "authenticated user votes",
    request("/rest/v1/feature_votes", {
      method: "POST",
      headers: { ...headers(anonKey, ownerAccessToken), Prefer: "return=minimal" },
      body: JSON.stringify({
        feature_request_id: feature.id,
        user_id: ownerUser.id,
      }),
    })
  );

  await assertBlocked(
    "anon cannot read raw vote rows",
    request(`/rest/v1/feature_votes?feature_request_id=eq.${feature.id}&select=user_id`, {
      headers: headers(anonKey),
    })
  );

  const voteCounts = await assertOk(
    "anon can read aggregate vote counts",
    request("/rest/v1/rpc/get_feature_vote_counts", {
      method: "POST",
      headers: headers(anonKey),
      body: JSON.stringify({ org_id: organization.id }),
    })
  );

  if (
    Number(voteCounts.find((row) => row.feature_request_id === feature.id)?.vote_count) !==
    1
  ) {
    throw new Error(`Expected one aggregate vote, got ${JSON.stringify(voteCounts)}`);
  }

  await assertOk(
    "admin can triage feature request",
    request(`/rest/v1/feature_requests?id=eq.${feature.id}`, {
      method: "PATCH",
      headers: { ...headers(anonKey, ownerAccessToken), Prefer: "return=minimal" },
      body: JSON.stringify({ status: "planned" }),
    })
  );

  await assertOk(
    "admin can create roadmap item",
    request("/rest/v1/roadmap_items", {
      method: "POST",
      headers: { ...headers(anonKey, ownerAccessToken), Prefer: "return=minimal" },
      body: JSON.stringify({
        organization_id: organization.id,
        title: "RLS smoke roadmap",
        status: "planned",
        sort_order: 1,
        feature_request_id: feature.id,
      }),
    })
  );

  const changelog = (
    await assertOk(
      "admin can create changelog draft",
      request("/rest/v1/changelogs", {
        method: "POST",
        headers: { ...headers(anonKey, ownerAccessToken), Prefer: "return=representation" },
        body: JSON.stringify({
          organization_id: organization.id,
          title: "RLS smoke release",
          body: "Smoke test release notes.",
          version: "0.0.0-smoke",
        }),
      })
    )
  )[0];

  await assertOk(
    "admin can publish changelog",
    request(`/rest/v1/changelogs?id=eq.${changelog.id}`, {
      method: "PATCH",
      headers: { ...headers(anonKey, ownerAccessToken), Prefer: "return=minimal" },
      body: JSON.stringify({ published_at: new Date().toISOString() }),
    })
  );

  const activityEvents = await assertOk(
    "admin can read trigger-recorded launch activity",
    request(
      `/rest/v1/launch_activity_events?organization_id=eq.${organization.id}&select=event_type,subject_label&order=created_at.desc`,
      {
        headers: headers(anonKey, ownerAccessToken),
      }
    )
  );

  const activityTypes = new Set(activityEvents.map((event) => event.event_type));
  for (const expectedType of [
    "waitlist_joined",
    "feature_request_created",
    "feature_request_triaged",
    "roadmap_item_created",
    "changelog_draft_created",
    "changelog_published",
    "team_invite_created",
    "team_invite_accepted",
    "team_invite_revoked",
  ]) {
    if (!activityTypes.has(expectedType)) {
      throw new Error(
        `Expected activity event ${expectedType}, got ${JSON.stringify(
          activityEvents
        )}`
      );
    }
  }
} finally {
  if (createdOrganizationId) {
    await request(`/rest/v1/organizations?id=eq.${createdOrganizationId}`, {
      method: "DELETE",
      headers: { ...headers(serviceRoleKey), Prefer: "return=minimal" },
    });
  }

  await Promise.all(
    createdUsers.map((userId) =>
      request(`/auth/v1/admin/users/${userId}`, {
        method: "DELETE",
        headers: headers(serviceRoleKey),
      })
    )
  );
}

console.log("RLS smoke test passed.");
