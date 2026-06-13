---
date: 2026-06-13
topic: ui-toonflow-frontend-experience
status: completed
---

# Toonflow-Inspired Frontend Experience Requirements

## Summary

Complete UI-TF-01 through UI-TF-12 by turning the Toonflow reference screenshots into a guga-flow visual baseline, documenting reusable tokens and layout rules, and closing the remaining accessibility/queue visibility gaps in the existing frontend.

## Reference Baseline

Observed from `/Users/lienli/Documents/GitHub/video-ref/Toonflow-app/docs/screenshot/`:

- Light gray application background with white content work surfaces.
- Narrow left icon rail that stays separate from project/content panels.
- Compact top chrome with small brand/app controls and restrained black/gray actions.
- Dense production workspace: left navigation/input, central production canvas/list, right inspector/task panel.
- Project/dashboard surfaces feel like operational tools, not marketing pages.
- Cards and rows are low-radius, compact, and text-dense with clear status chips.
- Disabled or unavailable actions are visually quiet and should not look primary.

## Scope Decision

The frontend should become more like a short-drama production tool while preserving guga-flow's canvas-first architecture and existing business flows. This slice does not clone Toonflow routing, branding, data models, or assets.

## Requirements

- R1. Visual baseline: document layout, colors, spacing, panel hierarchy, button style, disabled states, and non-copy boundaries.
- R2. Tokens: define reusable background, panel, border, shadow, radius, typography, status, and icon-size tokens in CSS or a frontend spec.
- R3. App shell: dashboard, canvas, and settings must use consistent top chrome, left rail, main workspace, and restrained brand/window controls.
- R4. Dashboard: project create/open/edit/duplicate/delete flows must stay intact while presenting a compact production dashboard.
- R5. Canvas workbench: desktop layout must preserve left production panel, central tldraw canvas, right inspector/assets/queue visibility, and bottom queue summary without covering tldraw controls.
- R6. Business node cards: node types must use consistent compact cards, status chips, truncation, and readable summaries.
- R7. Generation/export actions: implemented actions must be discoverable; unavailable actions must be disabled or clearly unavailable.
- R8. Assets/queue: resource and queue state must be continuously visible from the canvas workbench, with readable failed-job details.
- R9. Settings architecture: settings must group providers, prompts/skills, project defaults/manuals, data, files, and version modules without implying unfinished destructive behavior.
- R10. Responsive behavior: desktop and narrow layouts must avoid text overflow and overlapping toolbars; narrow screens may stack panels.
- R11. Accessibility/copy: icon buttons need accessible names; status text must be concise and compatible with the TF-18 i18n boundary.
- R12. Visual regression: dashboard/canvas/settings changes need browser smoke or screenshot records at desktop and narrow widths.

## Acceptance Examples

- AE1. **Covers R1, R2.** A visual baseline document exists with token and layout rules mapped to UI-TF-01/02.
- AE2. **Covers R3-R5.** Dashboard and canvas share the shell language; canvas keeps tldraw central and Inspector/Assets/Queue on the right without overlap.
- AE3. **Covers R6-R8.** Business node cards, generation/export actions, asset library, and queue summaries have stable compact UI states.
- AE4. **Covers R9.** Settings center groups implemented modules and labels validation-only data import honestly.
- AE5. **Covers R10-R12.** Browser verification covers desktop and narrow dashboard/canvas/settings states, and icon actions are reachable by accessible names.

## Scope Boundaries

- No new UI framework.
- No replacement of tldraw interaction model.
- No copying Toonflow brand, artwork, routing, or data model.
- No new generation/provider/export capability beyond visible UI state improvements.
- No mobile-first full production canvas requirement; narrow screens only need browsing and project management to remain usable.

## Key Decisions

- Keep the current guga-flow rail/topbar/workbench direction and document it as the baseline rather than restarting the UI.
- Use CSS tokens and existing lucide icons.
- Put queue visibility in the Inspector as a compact status panel while keeping the bottom queue as global chrome.
- Treat screenshots/browser smoke as the visual regression record until a deterministic screenshot suite is added.
