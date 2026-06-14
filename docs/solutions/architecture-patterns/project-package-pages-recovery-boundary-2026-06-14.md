# Project Package, Pages, and Recovery Boundary

Date: 2026-06-14

## Pattern

Project portability is split into a safe manifest package and page-scoped canvas persistence:

- `ProjectPackageManifest` is the only accepted import format.
- Package import runs inside one Prisma transaction.
- Canvas pages are represented by multiple `CanvasDocument` rows per project.
- Page metadata lives in stored snapshot JSON under `gugaFlowCanvasPage`, but API snapshots strip that metadata before returning editor state.
- Asset import creates manifest placeholders and records provenance instead of pretending binary files were bundled.

## Why

This keeps the existing single-canvas API compatible while allowing project organization by page. It also avoids leaking local paths or provider secrets into packages, and prevents failed imports from producing partially usable projects.

## Guardrails

- Reject packages whose `format` is not `guga-flow-project-package`.
- Reject unsupported schema versions.
- Validate node, edge, and asset enum values before import.
- Validate edges only connect nodes on their own page.
- Sanitize exported JSON strings for secret-like keys and local absolute paths.
- Return explicit page/node/edge/asset ID maps after import.
