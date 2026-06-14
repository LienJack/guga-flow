# CEX-27 Platform Version, Debug, Deployment, and Desktop Bridge Plan

Date: 2026-06-14
Status: completed

## Implementation Units

1. Platform config and contracts
   - Add build commit/time, release feed, runtime environment, and AI debug fields to shared settings contracts.
   - Read platform metadata from environment variables in backend config.
   - Force AI debug off in production.

2. Health and Settings Center
   - Add version/debug summaries to `GET /health`.
   - Add version/debug fields to project settings summary.
   - Render build/runtime/environment and AI debug availability in Settings Center.

3. Operations and desktop bridge documentation
   - Document production topology for Web, Nest, Worker, PostgreSQL, Redis, Nginx, health, logs, storage, and env vars.
   - Classify AI-CanvasPro desktop/local capabilities into Web, server, future adapter, and not-doing buckets.

4. Verification
   - Update backend health/settings tests, shared-type tests, frontend settings/i18n tests.
   - Run shared-types build, backend lint/test, frontend lint/test, full repo lint/test, production frontend build, and diff whitespace check.

## Boundaries

- AI debug is an operational flag, not a place to store provider keys or raw prompts.
- Browser-facing DTOs expose booleans and safe trace field names only.
- Desktop bridge work remains decision-only in this slice.
- Release feed is metadata; there is no updater or installer path.
