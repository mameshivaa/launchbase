# LaunchBase Security Checklist

This checklist maps common web application vulnerability classes to the current
LaunchBase baseline. It is intentionally practical for OSS forks: keep the
default app safe enough to publish, then require deployers to confirm their own
Supabase and hosting settings.

## Implemented baseline

| Area | LaunchBase baseline |
| --- | --- |
| XSS / script injection | React-rendered text, no `dangerouslySetInnerHTML`, bounded text inputs, CSP headers from `proxy.ts`. |
| Clickjacking | `frame-ancestors 'none'` and `X-Frame-Options: DENY`. |
| Content sniffing | `X-Content-Type-Options: nosniff`. |
| Referrer leakage | `Referrer-Policy: strict-origin-when-cross-origin`. |
| Browser permissions | `Permissions-Policy` disables camera, microphone, geolocation, payment, and USB by default. |
| Open redirect | Login `next` accepts only same-origin absolute paths beginning with `/` and rejects `//`. |
| SQL injection | Client talks to Supabase/PostgREST APIs; no raw SQL is built from browser input in the Next.js app. |
| Authorization | Product data is scoped by `organization_id`; RLS and RPC functions enforce owner/admin/member/public boundaries. |
| Public PII exposure | Waitlist rows and launch activity are admin-only; raw vote rows are not public. |
| Invite token leakage | Invitation tokens are stored only as SHA-256 hashes; raw tokens are returned only on create/rotate. |
| Input abuse | UI normalizes email/text fields; DB CHECK constraints bound lengths and basic formats for public tables. |
| Secret exposure | Next.js runtime uses only public Supabase URL/anon key plus user sessions; `service_role` is local test only. |
| Dependency scanning | CI runs `npm audit --audit-level=moderate`; Dependabot tracks npm and GitHub Actions updates. |
| Static analysis | CodeQL runs on pull requests, pushes to `main`, and a weekly schedule. |
| Header regression checks | `npm run security:headers` verifies the baseline headers on `/`, `/login`, and `/launchbase-demo`. |

## Fork owner checks before public release

- Run `npm run lint` and `npm run build`.
- Run `npm run security:headers` against a running production build.
- Run `supabase db reset` followed by `npm run test:rls` against local Supabase.
- Confirm `.env.local`, `.env*`, Supabase dumps, and service-role keys are not staged.
- In Supabase Auth, set the production Site URL and allowed redirect URLs.
- Enable email confirmation and production SMTP before accepting real users.
- Keep `SUPABASE_SERVICE_ROLE_KEY` out of Vercel/Next.js runtime environment variables.
- Enable GitHub private vulnerability reporting for the public repository.
- Apply the deployment and repository operations in
  [docs/security-operations.md](./security-operations.md).

## Security hardening status

These items map the original hardening backlog to the current repository
baseline. Some controls are implemented in code; others require production
provider settings and cannot be enforced by this repository alone.

### Implemented in the repository

- CSRF model documented in
  [docs/security-operations.md](./security-operations.md#csrf-model).
- Supabase local Auth settings are tightened in `supabase/config.toml`:
  email confirmation, stronger password baseline, secure password changes, and
  stricter sign-in/sign-up rate limits.
- `npm run test:rls` covers invalid slug, invalid email, long text rejection,
  invalid roles, member-to-admin escalation attempts, cross-organization access,
  revoked/expired invite reuse, and non-admin RPC calls.
- Dependency and repository scanning are configured with Dependabot, CodeQL, and
  `npm audit` in CI.
- Automated security header checks are available through
  `npm run security:headers` and run in CI.
- File upload, account recovery, security event, and data retention threat
  models are documented in
  [docs/security-operations.md](./security-operations.md).

### Requires production provider settings

- Host-level rate limits and bot challenges for public/high-frequency actions.
- Production SMTP, strict redirect URL allowlists, leaked password protection,
  and optional MFA in the deployed Supabase project.
- GitHub private vulnerability reporting, secret scanning, push protection, and
  branch protection on `main`.
- Long-retention security audit logging for failed attempts. Product activity
  events are recorded in Postgres, but failed security attempts should use
  Supabase Auth logs, host/WAF logs, or an external append-only sink.

### Still deferred until the feature exists

- File upload handling.
- Custom password reset UI.
- Security event alerting dashboards.
- Nonce-based CSP. The current baseline keeps `unsafe-inline` for practical
  Next.js/Tailwind compatibility; move to nonce-based `script-src` and
  `style-src` when the rendering model supports it cleanly.

Add these before using a fork for a high-traffic or sensitive production app.
