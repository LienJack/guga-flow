---
title: "CEX-01 Requirements: Auth Session Boundary"
type: requirements
status: completed
date: 2026-06-14
origin: docs/codex-reference-long-task-execution-checklist.md#cex-01登录会话与用户边界
source_modules:
  - TFR-01
---

# CEX-01 Requirements: Auth Session Boundary

## Summary

Add a single-user-first authentication boundary for guga-flow: password-hash login, signed browser session token, protected project APIs, frontend login/logout, and explicit separation between browser session authorization and trusted worker/provider runtime token authorization.

## Assumptions

*This requirements doc was authored without synchronous user confirmation. The items below are agent inferences that fill gaps in the input — un-validated bets that should be reviewed before planning proceeds.*

- A local/default admin account is acceptable for development, matching TFR-01's default-user transition note.
- JWT-compatible signed tokens can be implemented with Node crypto HMAC instead of adding a dependency.
- Browser session persistence can use a stored bearer token for this MVP; HttpOnly cookie hardening can follow when deployment/auth hosting is decided.
- Existing project ownership remains single-user for this module; RBAC and team permissions are out of scope.

## Functional Requirements

- R1. Seed or upsert a default admin user with an email and password hash.
- R2. Store only password hashes, never plaintext passwords.
- R3. Provide login, logout, and current-session API endpoints.
- R4. Return a signed session token with user id, email, display name, issue time, and expiration.
- R5. Protect browser project APIs so unauthenticated requests receive a predictable 401 response.
- R6. Keep worker generation endpoints and provider runtime config authorized by the worker token, not by browser session tokens.
- R7. Frontend users can log in, persist session across refresh, and log out.
- R8. Frontend API calls attach the session token without attaching it to worker/provider runtime calls.

## Non-Goals

- RBAC, teams, orgs, invite flows, OAuth, MFA, password reset email, account settings, refresh token rotation, and production SSO.
- Reworking project ownership beyond the existing default-user owner.
- Changing provider secret storage or exposing provider runtime credentials to the browser.

## Acceptance Evidence

- AE1. Backend tests cover password hashing, login success/failure, current-session parsing, and project API guard rejection.
- AE2. Frontend tests cover login API calls, authorization header attachment, and login/session UI behavior.
- AE3. Worker runtime provider credential tests continue to require `x-worker-token` for stored secrets.
- AE4. Existing workspace lint/test suites pass.
- AE5. Browser smoke confirms login redirects to the project dashboard and protected settings can load after login.
