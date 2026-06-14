# CEX-26 Storage Maintenance and Controlled Import Plan

Date: 2026-06-14
Status: completed

## Implementation Units

1. Shared contracts and backend DTOs
   - Add remote import, local import, imported asset result, and maintenance cleanup contracts.
   - Add validated DTOs for URL import, storage-key import, and cleanup confirmation.

2. Asset service and routes
   - Add `POST /projects/:projectId/assets/import-url`.
   - Add `POST /projects/:projectId/assets/import-local`.
   - Add `POST /projects/:projectId/assets/maintenance/cleanup`.
   - Deduplicate imports by safe URL hash or content hash.
   - Strip URL query/fragment and raw storage key from persisted metadata.

3. Settings data surface
   - Surface project package export/import validation in Settings Center.
   - Add URL import, controlled local import, dry-run cleanup, and confirmed cleanup controls.
   - Keep file/resource summaries visible.

4. Tests and verification
   - Cover SSRF, path traversal, oversized remote import, download failure, dry-run cleanup, and confirmed cleanup.
   - Cover frontend API endpoint wiring and settings static rendering.
   - Run shared-types build, backend lint/test, frontend lint/test, full repo lint/test, production frontend build, and diff whitespace check.

## Boundaries

- Local import accepts storage keys, not absolute paths.
- Remote import only accepts HTTPS URLs outside local/private address ranges.
- Cleanup only deletes unreferenced assets after a dry-run-compatible summary and explicit confirmation.
- Project package binary asset contents are still manifest-level references in this slice.
