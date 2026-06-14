# Safe Asset Import Maintenance Boundary

Date: 2026-06-14

## Pattern

Asset import and cleanup are server-controlled operations under `apps/backend/src/assets`:

- Remote imports validate HTTPS and block local/private hosts before fetching.
- Canonical URL provenance is stored without query strings or fragments.
- URL and storage-key provenance use hashes for dedupe and audit instead of raw secrets or paths.
- Local imports accept storage keys that resolve under configured storage handling, never server absolute paths.
- Cleanup calculates references through canvas nodes and generation jobs, supports dry run, and requires `DELETE_UNREFERENCED_ASSETS` before deletion.

## Why

CEX-26 combines storage maintenance, project transfer, and asset import. Keeping all filesystem and network decisions in the backend prevents the Settings UI from becoming a privileged path scanner or URL fetch proxy.

## Guardrails

- Never persist URL tokens or server absolute paths in asset metadata.
- Reject `..` storage-key segments, absolute paths, Windows drive paths, HTTP URLs, localhost, loopback, link-local, and private network hosts.
- Check remote `content-length` when present and validate downloaded bytes against `MAX_UPLOAD_BYTES`.
- Treat cleanup as a two-step operation: summarize first, delete only with confirmation.
- Add new import sources through the same provenance shape: source hash, content hash, imported time, MIME, size, and safety flags.
