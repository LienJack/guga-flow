# Toonflow Frontend Visual Baseline

## Context

The UI-TF task list asks guga-flow to borrow Toonflow's production-tool feel without copying its product, routes, data model, or artwork. The current guga-flow frontend already has the main shell direction: light app background, compact topbar, left icon rail, dashboard workspace, canvas workbench, settings center, business node cards, generation panels, and asset library.

## Reference Traits To Keep

- Light gray app canvas with white work surfaces.
- Narrow icon rail separate from content panels.
- Compact top chrome with small brand area and quiet controls.
- Dense production layout: navigation/input, central canvas or project area, right-side inspector/tasks/assets.
- Low-radius cards and buttons.
- Black/gray primary controls with muted disabled states.
- Status chips that communicate workflow state without large decoration.

## Non-Copy Boundaries

- Do not copy Toonflow brand, icons, screenshots, routes, or database model.
- Do not replace tldraw interaction with a custom canvas.
- Do not create marketing-style dashboard sections.
- Do not put product logic in CSS or translation text.
- Do not expose provider secrets, storage paths, or local editor endpoints to browser/renderer code.

## Token Table

The current CSS variables in `apps/frontend/src/app/globals.css` are the source of truth:

| Token | Current value | Use |
| --- | --- | --- |
| `--bg` | `#f5f7fb` | App background |
| `--panel` | `#ffffff` | Work surfaces, sidebars, cards |
| `--panel-strong` | `#eef3f8` | Subtle hover/secondary surfaces |
| `--ink` | `#18202d` | Main text |
| `--muted` | `#6a7483` | Secondary text and disabled states |
| `--line` | `#d9e1ea` | Borders and grid lines |
| `--accent` | `#256f6c` | Active state and successful state |
| `--accent-soft` | `#dcefed` | Active soft background |
| `--warning` | `#a15b16` | Warning/attention text |
| `--warning-soft` | `#fff0d9` | Warning soft background |

Layout tokens and conventions:

- App shell row height: compact topbar around 38px after Toonflow polish.
- Rail width: 72px on desktop.
- Sidebar width: 260-330px.
- Inspector width: 300-390px.
- Cards/buttons: 7-8px radius maximum unless a pill/status chip.
- Icon controls: 32-36px square targets with `title` and `aria-label`.
- Body copy in panels: 11-13px for dense operational surfaces.
- Text overflow: truncate one-line node/card labels; use wrapping only in larger text bodies.

## Task Mapping

| Task | Baseline / implementation |
| --- | --- |
| UI-TF-01 | This document captures the screenshot-derived baseline and non-copy boundaries. |
| UI-TF-02 | Token table above plus `globals.css` variables and shell classes define reusable tokens. |
| UI-TF-03 | `WorkbenchShell` and `ProjectDashboard` share top chrome, rail, brand mark, window dots, and white work surfaces. |
| UI-TF-04 | `ProjectDashboard` uses left create/edit form and right compact project list with icon actions. |
| UI-TF-05 | `WorkbenchShell` uses rail/sidebar/canvas/inspector plus bottom queue; `CanvasInspector` owns right-side production panels. |
| UI-TF-06 | `BusinessNodeCard` applies typed tones, short labels, status chips, truncation, and collapsed SceneFrame state. |
| UI-TF-07 | Generation/export controls use compact icon+text buttons; unimplemented topbar/rail items are disabled. |
| UI-TF-08 | AssetLibrary remains in the Inspector; the Inspector queue panel summarizes job counts and recent failures. |
| UI-TF-09 | `SettingsCenter` groups Providers, Prompts/Skills, Project Defaults, Data, Files, and Version modules. |
| UI-TF-10 | CSS stacks shell regions under 900px and keeps toolbar widths bounded. |
| UI-TF-11 | Icon-only actions carry accessible names; TF-18 owns zh/en copy boundary. |
| UI-TF-12 | Browser smoke records desktop and narrow dashboard/canvas/settings checks until deterministic screenshot tests are added. |

## Verification Pattern

For UI changes, verify:

- Dashboard at desktop and narrow width.
- Canvas at desktop and narrow width.
- Settings at desktop and narrow width.
- No obvious text overflow or overlapping toolbars.
- Icon-only buttons have accessible names.
- Disabled controls are visibly disabled and do not look like active affordances.

The current manual browser smoke is acceptable for this stage because tldraw rendering and backend-offline states make deterministic full-page screenshots noisy. A later visual regression suite should seed fixed project/canvas data and mask the tldraw viewport.
