# CEX-26 Storage Maintenance and Controlled Import Requirements

Date: 2026-06-14
Status: completed

## Goal

Add safe project data maintenance and controlled asset import paths without exposing server filesystem details or accepting arbitrary local paths.

## Scope

- Expose project data export and package import validation from the settings/data surface.
- Add asset maintenance cleanup with dry-run counts and a second confirmation token before deletion.
- Add remote URL asset import that downloads server-side, rejects unsafe hosts, records safe provenance, and deduplicates by canonical URL or content hash.
- Add controlled local import from storage keys already inside configured storage roots.
- Record import time, MIME type, size, content hash, and safety metadata on imported assets.
- Keep resource statistics visible in Settings Center.

## Non-Goals

- Do not provide raw SQL maintenance commands.
- Do not scan arbitrary user paths or server directories.
- Do not accept server absolute paths from the UI.
- Do not expose URL tokens, local storage keys, or server absolute paths in returned provenance metadata.
- Do not add browser-plugin or desktop privileged import behavior in this slice.

## Acceptance

- Users can export project package data and validate a project package import.
- Cleanup exposes dry-run totals and requires `DELETE_UNREFERENCED_ASSETS` before deleting.
- URL import and controlled local storage-key import can create assets.
- SSRF, path traversal, oversized remote import, and download failure cases have backend tests.
- Settings Center exposes data/package and asset maintenance controls without raw paths.
