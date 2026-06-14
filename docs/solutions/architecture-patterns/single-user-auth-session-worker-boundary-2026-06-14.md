---
title: "Keep Single-User Browser Sessions Separate from Worker Secrets"
date: 2026-06-14
category: architecture-patterns
module: cex-01-auth-session-boundary
problem_type: architecture_pattern
component: authentication
severity: medium
applies_when:
  - "Adding login to a single-user-first app that already has project-scoped APIs"
  - "Protecting browser project APIs without introducing RBAC, OAuth, teams, or orgs"
  - "Keeping worker/provider runtime credentials outside ordinary browser sessions"
related_components:
  - provider_management
  - worker_runtime_config
  - project_api
  - settings_center
tags:
  - authentication
  - browser-session
  - worker-boundary
  - default-admin
  - secret-boundary
---

# Keep Single-User Browser Sessions Separate from Worker Secrets

## Context

CEX-01 needed a real login foundation before provider, Agent, project package, and maintenance workflows grew larger. The app already had a default project owner and secret-safe provider runtime config, but browser requests were not authenticated and the worker/provider credential path needed to remain separate.

The scope was intentionally narrow: one default admin user, password hash storage, signed bearer sessions, protected project APIs, and a trusted worker token boundary. RBAC, orgs, OAuth, refresh-token rotation, and password reset stay out until the product has a real multi-user requirement.

## Guidance

Model the first auth slice as two separate boundaries:

- Browser users authenticate through `/auth/login`, receive a signed bearer session, and use that token for project-scoped API calls.
- Workers authenticate through their own trusted token path when `WORKER_API_TOKEN` is configured, and they continue to access provider runtime config through worker-only endpoints.

Seed the default admin through the same auth service that owns password hashing. Existing project creation should call that seed path instead of creating a passwordless default user, so the default owner cannot drift away from login identity.

Keep session DTOs small and browser-safe:

```ts
export interface AuthSessionRecord {
  token: string;
  user: AuthUserRecord;
  expiresAt: string;
}
```

On the frontend, keep token persistence in one helper and attach `Authorization` in the shared API client. UI components should react to `401` as a session problem and redirect to `/login`, rather than each component inventing its own auth header behavior.

## Why This Matters

Single-user-first auth still needs a clean trust split. Browser sessions prove a human can operate project APIs; worker tokens prove a backend worker can fetch runtime provider configuration. Combining those paths would make provider secrets easier to leak into browser DTOs, job JSON, logs, or snapshots.

Using the auth seed path for the default owner also prevents a subtle future mismatch: a project can keep `ownerUserId: "default-user"` while the corresponding user row always has the password hash and admin email needed for login.

## When to Apply

- Use this pattern while the product has one admin/operator and project ownership is not yet multi-tenant.
- Keep browser guards focused on project APIs; leave health, auth, public provider catalogs, and worker paths on their own boundaries.
- Add RBAC only when there are multiple users with different project permissions.
- Add refresh tokens or revocation storage only when session lifetime, device management, or logout semantics require it.

## Examples

Backend guard split:

```ts
@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    WorkerAuthGuard,
    { provide: APP_GUARD, useClass: BrowserAuthGuard },
  ],
  exports: [AuthService, WorkerAuthGuard],
})
export class AuthModule {}
```

Project creation uses the auth seed:

```ts
private async ensureDefaultUser(): Promise<void> {
  await this.authService.ensureDefaultAdmin();
}
```

Frontend API calls attach the browser token centrally:

```ts
const token = path === "/auth/login" ? undefined : getAuthToken();
if (token && !hasHeader(headers, "Authorization")) {
  headers.Authorization = `Bearer ${token}`;
}
```

## Related

- [Keep Provider Management Secret-Safe with Worker Runtime Config](./provider-management-secret-safe-runtime-config-2026-06-13.md)
- [Keep LLM Provider Models as Safe Project Metadata](./llm-provider-model-metadata-boundary-2026-06-14.md)
- [Resolve Agent Roles Through Provider Management](./agent-role-runtime-config-resolution-2026-06-14.md)
- [Keep Settings Center Export Validation-Only and Secret-Safe](./settings-center-safe-export-validation-2026-06-13.md)
