# Security Policy

LaunchBase is an OSS starter built around Supabase Auth, Postgres RLS, RPC, and DB-backed invite links. Security reports are especially important when they involve tenant isolation or public/private data boundaries.

## Please report privately

Do not open a public issue for:

- RLS bypasses.
- Waitlist PII exposure.
- Raw vote row or voter `user_id` exposure.
- Invitation token leakage or replay issues.
- Workspace membership escalation.
- Any path that requires `SUPABASE_SERVICE_ROLE_KEY` in the app runtime.

Use GitHub private vulnerability reporting if available on the repository. If it is not enabled, open a minimal public issue that says you have a private security report and do not include exploit details.

## Supported version

LaunchBase is currently pre-1.0. Security fixes are handled on `main`.

## Local security checks

Before releasing or deploying a fork, run:

```bash
supabase db reset
npm run test:rls
npm run lint
npm run build
npm run security:headers
```

Also confirm these production settings:

- Supabase Auth Site URL points to your hosted app.
- Redirect URLs include `/login`, `/account`, and `/invite/*`.
- Email confirmations are enabled for real users.
- `SUPABASE_SERVICE_ROLE_KEY` is not present in frontend or Vercel runtime env.
- RLS remains enabled on all product tables.

See [docs/security-checklist.md](./docs/security-checklist.md) for the
vulnerability-class checklist used by this starter. See
[docs/security-operations.md](./docs/security-operations.md) for production
settings that must be applied outside the repository.
