import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";

import { I18nProvider } from "../../lib/i18n";
import { ShortcutPreferencesPanel } from "./shortcut-preferences-panel";

describe("ShortcutPreferencesPanel", () => {
  it("renders shortcut bindings, canvas preferences, and import/export actions", () => {
    const html = renderToStaticMarkup(
      <I18nProvider initialLocale="en">
        <ShortcutPreferencesPanel />
      </I18nProvider>,
    );

    expect(html).toContain("Shortcuts and Canvas");
    expect(html).toContain("Search nodes");
    expect(html).toContain("Fit canvas");
    expect(html).toContain("Grid");
    expect(html).toContain("Defaults");
    expect(html).toContain("Export");
    expect(html).toContain("Import");
  });
});
