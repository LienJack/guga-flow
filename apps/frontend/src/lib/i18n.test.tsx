import { describe, expect, it } from "vitest";

import { initialLocale, LOCALE_STORAGE_KEY, translate } from "./i18n";

describe("i18n", () => {
  it("translates English and Chinese UI copy with params", () => {
    expect(translate("en", "queue.queued", { count: 3 })).toBe("3 queued");
    expect(translate("zh", "queue.queued", { count: 3 })).toBe("排队 3");
  });

  it("falls back to English and then the key", () => {
    expect(translate("zh", "export.queueExport")).toBe("排队导出");
    expect(translate("zh", "missing.translation.key")).toBe("missing.translation.key");
  });

  it("reads only supported persisted locales", () => {
    expect(initialLocale({ getItem: () => "zh" })).toBe("zh");
    expect(initialLocale({ getItem: (key) => (key === LOCALE_STORAGE_KEY ? "fr" : null) })).toBe("en");
    expect(initialLocale(undefined)).toBe("en");
  });
});
