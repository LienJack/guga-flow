# AI-CanvasPro Desktop Adapter Boundary

Date: 2026-06-14

## Decision

Keep guga-flow Web-first. Do not add Electron, Tauri, preload scripts, IPC channels, auto-updaters, screen capture services, or trusted local credential stores in CEX-27.

## Capability Classification

| Capability | Owner | Decision |
| --- | --- | --- |
| Project package export/import | Web + server | Already supported through project package APIs and user-selected JSON import. |
| Recovery snapshot | Web + server | Supported as a server-generated JSON snapshot downloaded by the browser. |
| Remote URL asset import | Server | Supported through controlled backend download and asset provenance. |
| Controlled local import | Server | Supported through storage keys inside configured storage handling, not arbitrary filesystem paths. |
| Provider credentials | Server | Web mode stores and resolves credentials on the backend only. |
| Secure local credential store | Future desktop adapter | Defer until a desktop wrapper exists; renderer must never receive raw secrets. |
| File picker for arbitrary folders | Future desktop adapter | Requires explicit folder allowlist, consent, size/type limits, and provenance. |
| Clipboard import | Future desktop adapter | Requires user action, type limits, and provenance; no silent scraping. |
| Screenshot capture | Future desktop adapter | Requires user authorization and deletion policy; no silent screen recording. |
| Web preview and browser capture | Future desktop adapter | Requires consent, source tracking, and privacy restrictions; do not bypass access controls. |
| Notifications | Future desktop adapter | Optional after job lifecycle and user preferences are stable. |
| Auto update | Out of scope | Not part of Web MVP; release feed remains metadata only. |
| AI-CanvasPro IPC/preload reuse | Out of scope | Do not copy IPC contracts or preload code. |

## Secret Boundary

Web mode:

- Provider credentials live in backend storage.
- Browser DTOs expose configured booleans and safe masks only.
- Generation jobs store provider/model/settings metadata, not secrets.

Future desktop mode:

- A desktop adapter may own a trusted credential store.
- Renderer state still receives only masks and readiness booleans.
- Migration, delete, test connection, and audit events must be designed before implementation.

## Entry Criteria For Future Adapter Work

- Web asset, project package, and worker flows are stable.
- A desktop-only requirement cannot be satisfied by browser upload or server-side controlled import.
- Threat model covers file access, screenshots, clipboard, browser preview, and local process execution.
- Tests cover consent, path redaction, type/size limits, failure handling, and secret redaction.
