# Security Operations Guide

This guide covers the security tasks that cannot be fully enforced from the
starter repository alone. Apply these settings in the deployed Supabase project,
hosting provider, and GitHub repository before using a fork with real users.

## Abuse Controls

LaunchBase writes public and high-frequency actions through Supabase APIs:
waitlist join, signup/login, feature requests, voting, and invitation RPCs.

Repository baseline:

- Supabase local Auth rate limits are tightened in `supabase/config.toml`.
- Public text and email inputs are bounded in the UI and by Postgres CHECK
  constraints.
- `npm run test:rls` covers invalid input, role escalation, invite misuse, and
  cross-organization access.

Production requirements:

- Put host-level rate limits in front of public pages and Supabase endpoints.
  Use Vercel Firewall, Cloudflare WAF/rate limiting, Supabase Edge Functions,
  or another gateway that can count by IP and path.
- Add a bot challenge such as Cloudflare Turnstile or hCaptcha to anonymous
  public forms when traffic is not trusted.
- Keep Supabase Auth sign-in/sign-up rate limits strict enough for the expected
  product traffic.
- Monitor repeated failed login, invite, and mutation attempts. Supabase
  Auth logs and host logs are the right durable source for failed attempts.

## CSRF Model

Current LaunchBase mutations happen from Client Components through the Supabase
browser client. The browser sends Supabase-managed auth state to Supabase, and
the database enforces authorization through RLS and security-definer RPC checks.

Current safeguards:

- No app Route Handlers or Server Actions accept state-changing browser posts.
- Login redirects accept only same-origin relative paths and reject `//`.
- Security headers set `form-action 'self'`.
- State changes are authorized again at the database boundary.

If a fork adds Server Actions or Route Handlers that mutate data:

- Require same-origin requests for every state-changing endpoint.
- Add a CSRF token or equivalent double-submit/same-origin protection.
- Never authorize writes from request body user IDs, organization IDs, or roles
  alone. Re-read the current session and re-check membership server-side.
- Keep RLS enabled so direct Supabase calls remain bounded.

## Supabase Auth Production Settings

Before accepting real users:

- Set the production Site URL.
- Set a strict redirect URL allowlist. Avoid broad wildcards.
- Enable email confirmations.
- Configure production SMTP and sender identity.
- Use a minimum password length of at least 8 characters with letters and
  digits required.
- Enable secure password change / reauthentication.
- Enable leaked password protection if it is available in the Supabase project.
- Require MFA for owners/admins if the fork handles sensitive customer data.

## GitHub Repository Protection

Before publishing:

- Enable private vulnerability reporting.
- Enable GitHub secret scanning and push protection.
- Require the CI and CodeQL checks on `main`.
- Require pull request review before merging to `main`.
- Keep Dependabot enabled for npm and GitHub Actions.

## Security Events

LaunchBase records product activity in `launch_activity_events` from Postgres
triggers. That is useful for admin timelines, but it is not a complete security
audit log because failed attempts inside a rolled-back transaction cannot be
durably logged by the same transaction.

Use these event sources in production:

- Supabase Auth logs for failed login, signup, password, and MFA events.
- Hosting/WAF logs for rate-limit, bot, and blocked request events.
- Supabase database logs for RLS/policy errors and RPC exceptions.
- Product activity events for successful invite, roadmap, changelog, feature,
  and waitlist changes.

If a fork needs long-retention security audit logs, write them to an external
append-only sink from middleware, Edge Functions, or a dedicated logging
pipeline.

## Data Retention

Set explicit retention periods before collecting real PII:

- Waitlist entries: define when pending leads are deleted or anonymized.
- Invitation rows: delete or archive accepted, revoked, and expired invites
  after the support window closes.
- Product activity: keep only as long as customer support and compliance need.
- Security logs: keep separately from product activity if access, retention, or
  legal requirements differ.

## File Upload Threat Model

LaunchBase does not include uploads by default. Before adding uploads:

- Use private buckets by default.
- Restrict MIME types and extensions.
- Set per-file and per-user size limits.
- Generate short-lived signed URLs for private downloads.
- Store user uploads outside public static assets.
- Scan high-risk file types before sharing them with other users.
- Set download headers that prevent browser execution for untrusted content.
- Keep bucket RLS policies separate from product table policies.

## Account Recovery Threat Model

LaunchBase does not include a custom recovery UI by default. Before adding one:

- Keep recovery redirects on the same strict allowlist as login/signup.
- Avoid revealing whether an email exists.
- Use Supabase token lifetimes appropriate for the product risk.
- Require recent login before sensitive password or email changes.
- Review recovery email templates so they do not leak organization membership
  or invite details.
