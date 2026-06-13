# Multilingual UI Context Boundary

## Context

TF-18 needed English and Chinese UI switching for the core production workbench without introducing backend locale storage or moving workflow rules into translation files.

## Decision

The frontend owns a lightweight i18n boundary in `apps/frontend/src/lib/i18n.tsx`:

- `I18nProvider` stores the selected `en`/`zh` locale in `localStorage`.
- `useI18n()` exposes `locale`, `setLocale`, and `t(...)`.
- `translate(...)` provides deterministic fallback to English and then the key.
- Workbench shell owns the provider and language switcher so canvas and settings children share one locale.

The dictionary contains stable product UI copy only. Provider names, model names, project titles, skill names, asset labels, backend validation messages, and generated/user-authored content remain data.

## Consequences

- Locale switching is browser-local and requires no database migration.
- The workbench, save/queue chrome, generation controls, editor export controls, and settings center can switch between English and Chinese.
- English remains the safe fallback for future untranslated keys.
- If future requirements need locale-aware routes, plural rules, dates, or server-rendered locale negotiation, this boundary can be replaced by a full i18n framework without changing provider/export business logic.
