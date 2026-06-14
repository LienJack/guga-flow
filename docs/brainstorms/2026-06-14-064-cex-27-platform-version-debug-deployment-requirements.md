# CEX-27 Platform Version, Debug, Deployment, and Desktop Bridge Requirements

Date: 2026-06-14

## Goal

Expose safe platform status for Web/API/runtime builds, add a constrained AI debug flag surface, document production deployment, and classify desktop/local bridge capabilities without adding a desktop shell.

## Scope

- Settings Center shows app, API, build commit, build time, runtime, environment, and release feed metadata when configured.
- Health output includes version and debug availability without exposing secrets.
- AI debug is enabled only when the backend is not running in production and the explicit env flag requests it.
- Production docs cover Web, Nest API, Worker, PostgreSQL, Redis, Nginx, health checks, logs, data directories, asset storage, and required environment variables.
- Desktop/local capabilities are classified as Web-owned, server-owned, future desktop-adapter-owned, or explicitly out of scope.

## Non-Goals

- Do not create Electron or Tauri apps.
- Do not copy AI-CanvasPro preload, IPC, updater, or secure-store code.
- Do not expose provider secrets, worker tokens, session secrets, database URLs, or server absolute paths.
- Do not auto-download releases or replace running services.

## Acceptance

- Settings Center displays app/API/build/runtime version facts.
- AI debug status is visible and production-safe.
- Health checks include version/debug summaries and remain secret-safe.
- Production deployment topology and env var guidance exist.
- Desktop bridge capability classification exists with explicit owner modules and exclusions.
