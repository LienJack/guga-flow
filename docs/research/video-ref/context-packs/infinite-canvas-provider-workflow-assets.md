# Infinite-Canvas Provider / Workflow / Asset Context Pack

> Date: 2026-06-14
> Source: `/Users/lienli/Documents/GitHub/video-ref/Infinite-Canvas`
> Source version: commit `9fb9a908c78f6d9e23fcfc03b7cf5d8b77ff3e0e`, `VERSION` `2026.06.12`
> Use with: `docs/infinite-canvas-reference-long-task-development-flow.md`

This pack is an evidence index for the Infinite-Canvas reference track. It records behavior-level facts and guga-flow adaptation notes only. Do not copy reference source, static assets, screenshots, workflow JSON, bundled binaries, startup scripts, or branding.

## Source Boundary

- Fact: `README.md:24` to `README.md:29` lists broad provider protocols, RunningHub workflow/app calls, Jimeng CLI, and local/LAN ComfyUI.
- Fact: `README.md:34` to `README.md:43` and `LICENSE:1` to `LICENSE:10` state a custom non-commercial boundary and require authorization for commercial packaging.
- Inference: guga-flow may borrow workflow shape, failure cases, and UX expectations, but implementation must stay original, typed, server-side, and canvas-first.

## Provider And Model Discovery

- Fact: `main.py:261` defines provider protocols including OpenAI-like, Gemini, Ark/Volcengine, RunningHub, and Jimeng.
- Fact: `main.py:9970` to `main.py:10331` implements connection testing, model fetch, protocol probing, model grouping, redirect/HTML detection, and friendly API-base guidance.
- Fact: `main.py:1180` to `main.py:1215` exposes public provider metadata with masked credential presence rather than raw key values.
- Inference: IC-01 and IC-02 should keep guga-flow's stronger secret boundary: browser DTOs expose credential presence/source only, worker resolves runtime config from trusted backend endpoints, and discovery responses must not include raw headers, keys, or full upstream bodies.

## Workflow And Canvas Transfer

- Fact: `static/comfyui-settings.html:31` to `static/comfyui-settings.html:94` presents ComfyUI endpoint and workflow mapping UI.
- Fact: `main.py:14032` to `main.py:14190` is the primary route band for ComfyUI instance/workflow/config/run behavior according to the coverage ledger.
- Fact: `static/smart-canvas.html:132` to `static/smart-canvas.html:157` exposes selected-node workflow import/export with JSON and resource-inclusive package options.
- Inference: guga-flow should define its own versioned canvas fragment schema with validate-before-write import. It should not claim Infinite-Canvas JSON compatibility.

## Asset Library And Prompt Library

- Fact: `static/asset-manager.html:28` to `static/asset-manager.html:40` shows asset, workflow, and prompt-library tabs as one local workbench surface.
- Fact: `main.py:11903` to `main.py:12584` is the primary route band for asset library, prompt library, shared folders, and batch asset operations according to the coverage ledger.
- Inference: guga-flow should fold these into project-scoped `Asset`, collections, tags, prompt/skill templates, and canvas inspector/library panels rather than building a separate online-gallery product.

## Local Platform, CLI, Update, Rollback

- Fact: `README.md:17` describes a `VERSION`-based update hint.
- Fact: `main.py:1750` to `main.py:1787` checks updates; `main.py:2064` to `main.py:2190` stages updates with backups; `main.py:2227` to `main.py:2281` lists backups and rolls back.
- Fact: `tools/jimeng_cli_install.ps1`, `安装即梦CLI.bat`, and `登录即梦CLI.command` show local CLI packaging exists in the reference project.
- Inference: guga-flow P2 local platform work should remain decision-document first. Any future local path, CLI, token, desktop, update, backup, or rollback feature needs explicit user authorization and must not expose private paths or credentials to browser DTOs.

## Open Questions For Future Packs

- Pending Verification: The exact RunningHub task polling response shapes should be rechecked only when IC-07 is actively planned.
- Pending Verification: ComfyUI field mapping constraints should be rechecked against current ComfyUI API docs during IC-06 planning.
- Pending Verification: Image editing primitives in `static/smart-canvas.html` need a narrower pack before IC-10.
