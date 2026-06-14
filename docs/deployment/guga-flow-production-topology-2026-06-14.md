# Guga Flow Production Topology

Date: 2026-06-14

## Topology

Production is a Web-first service stack:

- Web: Next.js frontend serving `/`, project canvas, and settings routes.
- API: Nest backend serving `/api/v1/*`.
- Worker: background generation and media jobs.
- PostgreSQL: durable application data.
- Redis: queue and coordination state.
- Nginx or an equivalent edge proxy: TLS, static routing, and API/Web routing.
- Asset storage: filesystem or mounted object-storage-compatible directory owned by the backend/worker.

## Routing

- `/` and app routes go to the Web service.
- `/api/v1/*` goes to the Nest API.
- Worker processes do not receive public traffic.
- `/api/v1/health` is the API health check.

## Health Checks

- API: `GET /api/v1/health` returns status, version, debug availability, and provider configured booleans.
- Web: the platform health check should request `/login` or `/`.
- Worker: use process supervision and queue-claim logs until a dedicated worker health route is added.
- PostgreSQL and Redis: use the platform's native health probes.

## Logs

Collect stdout/stderr from Web, API, and Worker processes. Logs may include trace ids, provider ids, model ids, latency, status, and sanitized errors. Logs must not include provider keys, worker tokens, session secrets, database URLs, raw local paths, or URL tokens.

## Data Directories

Configure data paths with environment variables:

- `ASSET_STORAGE_DIR`: generated and imported asset objects.
- `UPLOAD_STORAGE_DIR`: upload source area.
- `EXPORT_STORAGE_DIR`: editor package exports.

Mount these paths as durable volumes shared by the API and Worker. Do not expose these directories through a static file server; assets are served through project-scoped API routes.

## Required Environment

- `DATABASE_URL`
- `REDIS_URL`
- `AUTH_SESSION_SECRET`
- `PROVIDER_CONFIG_ENCRYPTION_KEY`
- `WORKER_API_TOKEN` for non-local worker/API communication
- `CORS_ALLOWED_ORIGINS`
- `NEXT_PUBLIC_API_BASE_URL`
- `ASSET_STORAGE_DIR`
- `UPLOAD_STORAGE_DIR`
- `EXPORT_STORAGE_DIR`

## Optional Environment

- `APP_VERSION`
- `BUILD_COMMIT`
- `BUILD_TIME`
- `RELEASE_FEED_URL`
- `AI_DEBUG_ENABLED` (`true` is honored only outside production)
- Provider-specific API keys, stored server-side only.
- `LOCAL_EDITOR_URL` for controlled editor export handoff.

## Startup Order

1. PostgreSQL and Redis.
2. Prisma migration step.
3. Nest API.
4. Worker.
5. Next.js Web service.
6. Nginx or platform routing layer.

## Security Boundary

The browser receives metadata and scoped API URLs only. Provider credentials, worker tokens, session secrets, database URLs, mounted storage paths, and desktop adapter privileges stay server-side.
