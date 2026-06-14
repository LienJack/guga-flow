import { describe, expect, it } from "vitest";

import { initialLocale, LOCALE_STORAGE_KEY, translate } from "./i18n";

describe("i18n", () => {
  it("translates English and Chinese UI copy with params", () => {
    expect(translate("en", "queue.queued", { count: 3 })).toBe("3 queued");
    expect(translate("zh", "queue.queued", { count: 3 })).toBe("排队 3");
    expect(translate("en", "shortcuts.canvasFit")).toBe("Fit canvas");
    expect(translate("zh", "shortcuts.canvasFit")).toBe("适应画布");
    expect(translate("en", "maintenance.importedAsset", { assetId: "asset_1" })).toBe("Imported asset_1");
    expect(translate("zh", "maintenance.importedAsset", { assetId: "asset_1" })).toBe("已导入 asset_1");
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
