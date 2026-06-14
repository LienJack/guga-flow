# CEX-24 Project Package, Canvas Pages, and Recovery Requirements

Date: 2026-06-14

## Goal

Bring guga-flow closer to project-level portability by adding a native project package schema, multi-page canvas organization, and recovery snapshots while preserving the existing single-canvas workflow.

## Scope

- Export a guga-flow project package manifest with project metadata, canvas pages, nodes, edges, safe asset manifest entries, and non-secret settings references.
- Import a guga-flow project package into a new project with page/node/edge/asset ID remapping.
- Reject non guga-flow formats, including AI-CanvasPro JSON.
- Ensure failed imports do not leave half-created projects.
- Allow one project to create and open multiple canvas pages.
- Keep old projects compatible by resolving the first page as the default page, or creating a default page when none exists.
- Provide a recovery snapshot endpoint that captures latest saved page snapshots and graph counts.

## Non-Goals

- No AI-CanvasPro JSON compatibility.
- No secret, provider key, or local absolute path packaging.
- No binary asset bundle in this slice; imported assets are manifest placeholders with explicit provenance.
- No cross-page semantic edge UX.

## Acceptance

- Project package export/import works through API and frontend panel.
- Import validation rejects malformed or foreign packages before transaction work begins.
- Multi-page canvas tabs can create and switch pages.
- Page-scoped autosave and node creation use the active page.
- Recovery snapshot download contains page snapshots without internal page metadata.
