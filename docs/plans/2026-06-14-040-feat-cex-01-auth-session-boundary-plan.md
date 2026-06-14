---
title: feat: Complete CEX-01 auth session boundary
type: feat
status: completed
date: 2026-06-14
origin: docs/brainstorms/2026-06-14-040-cex-01-auth-session-boundary-requirements.md
---

# feat: Complete CEX-01 Auth Session Boundary

## Summary

Add a single-user-first auth system with password-hash login, signed bearer session tokens, protected project APIs, frontend login/logout, and an explicit worker-token boundary for provider runtime credentials.

## Scope Boundaries

- Do not implement RBAC, teams, orgs, OAuth, MFA, password reset, refresh-token rotation, or SSO.
- Do not expose provider secrets or worker runtime credentials to browser sessions.
- Do not change the project ownership model beyond seeding/updating the default admin user.
- Do not block local development from bootstrapping a default admin account.

## Requirements Trace

- R1/R2. Default admin seed uses password hash fields on `User`.
- R3/R4. Auth endpoints return and validate signed session token DTOs.
- R5. Project-scoped browser APIs are protected by a session guard.
- R6. Worker endpoints use a separate worker token guard/path.
- R7/R8. Frontend login/session helper persists token and attaches it to normal API requests.

## Implementation Units

- U1. **Shared auth contracts and config**
  - Add shared auth DTO/result/session types.
  - Add auth-related app config fields for session secret, token TTL, admin email, and admin password.
  - Add Prisma `User.passwordHash` / `lastLoginAt` migration.

- U2. **Backend auth service, controller, and guards**
  - Add `AuthModule`, `AuthService`, login/current/logout endpoints.
  - Hash passwords with Node crypto and sign/verify HMAC session tokens.
  - Add global browser auth guard that protects project APIs and leaves public/auth/worker routes to their own boundary.
  - Add worker guard for `/worker/generation/*` using `x-worker-token` when configured.

- U3. **Ownership and protected API integration**
  - Replace local `ensureDefaultUser` passwordless upsert with the auth seed path.
  - Keep project creation under the default admin owner for this module.
  - Add tests proving unauthenticated project API access fails and authenticated access succeeds.

- U4. **Frontend session flow**
  - Add API helpers and session storage.
  - Add `/login` page and login panel.
  - Add logout actions in dashboard/workbench chrome.
  - Ensure API requests attach Authorization when a token exists and redirect/login errors are readable.

- U5. **Validation and learning capture**
  - Run focused backend/frontend/shared checks and workspace lint/test.
  - Browser smoke login and protected settings load.
  - Capture solution learning for the single-user auth boundary.
  - Mark this plan completed after verification.

## Verification Targets

- `pnpm --filter @guga-flow/shared-types run lint`
- `pnpm --filter @guga-flow/shared-types test`
- `pnpm --filter @guga-flow/shared-types run build`
- `pnpm --filter @guga-flow/backend run prisma:generate`
- `pnpm --filter @guga-flow/backend run lint`
- `pnpm --filter @guga-flow/backend test`
- `pnpm --filter @guga-flow/frontend run lint`
- `pnpm --filter @guga-flow/frontend test`
- `pnpm -r lint`
- `pnpm -r test`
- Browser smoke: login -> dashboard -> settings API succeeds.
