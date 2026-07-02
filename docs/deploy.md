# Deploy LaunchBase on Vercel + Supabase Cloud

This guide keeps LaunchBase as an OSS starter: you own the Supabase project,
the Vercel app, and the invite links. No managed LaunchBase backend is required.

## 1. Create a Supabase project

1. Create a new Supabase Cloud project.
2. Copy the project URL and anon key from **Project Settings → API**.
3. Link the local repo if you use the Supabase CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

For a demo workspace, you can optionally run seed data locally first. For a real
startup workspace, prefer creating the workspace from `/account` after deploy.

## 2. Configure Vercel

Create a Vercel project from the GitHub repo and set:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-cloud-anon-key>
```

Do not add `SUPABASE_SERVICE_ROLE_KEY` to the frontend app. LaunchBase app code
uses the anon key plus the signed-in user session; RLS enforces authorization.

## 3. Configure Supabase Auth

In Supabase **Authentication → URL Configuration**:

- Site URL: `https://<your-vercel-domain>`
- Redirect URLs:
  - `https://<your-vercel-domain>/login`
  - `https://<your-vercel-domain>/account`
  - `https://<your-vercel-domain>/invite/*`

For production, enable email confirmations. Local development has confirmations
disabled for fast demos.

## 4. Configure production email

Before relying on confirmations, password resets, or future provider-sent
invites, configure Supabase Auth SMTP:

- verified sender domain
- stable sender address
- SMTP host, port, user, and password/API key
- reasonable rate limits
- branded confirmation/reset templates

LaunchBase team invitations are DB-backed copyable links. They do not require an
email provider SDK. You can add Resend, SendGrid, or Supabase Auth invites later
without changing the core RLS model.

## 5. Post-deploy smoke checks

Run locally before deploy:

```bash
npm run lint
npm run build
supabase db reset
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_ANON_KEY=<local-anon-key> \
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key> \
npm run test:rls
```

Then verify in the hosted app:

1. Sign up.
2. Create a workspace from `/account`.
3. Open `/<slug>/admin`.
4. Create a team invite and copy the link.
5. Sign in as the invited email and accept the invite.
6. Submit a waitlist entry on the public page.
7. Triage a feature request, add a roadmap item, and publish a changelog draft.

## Release boundary

LaunchBase does not include billing, managed hosting operations, or a production
email provider SDK. It is a Supabase-native starter intended to be forked and
owned by the startup using it.
