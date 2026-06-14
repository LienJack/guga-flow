import { describe, expect, it } from "vitest";

import {
  CANVAS_PREFERENCES_STORAGE_KEY,
  SHORTCUT_STORAGE_KEY,
  defaultShortcutPreferences,
  eventMatchesShortcut,
  exportShortcutSettings,
  importShortcutSettings,
  isEditableShortcutTarget,
  loadCanvasPreferences,
  loadShortcutPreferences,
  normalizeShortcutBinding,
  saveCanvasPreferences,
  saveShortcutPreferences,
  shortcutConflicts,
} from "./shortcuts";

describe("shortcut registry", () => {
  it("normalizes modifier order and keyboard events", () => {
    expect(normalizeShortcutBinding("shift + cmd + z")).toBe("Mod+Shift+Z");
    expect(normalizeShortcutBinding("control+k")).toBe("Mod+K");
    expect(eventMatchesShortcut({ key: "k", metaKey: true, ctrlKey: false, altKey: false, shiftKey: false }, ["Mod+K"])).toBe(true);
  });

  it("detects user-visible conflicts while ignoring reserved browser shortcuts", () => {
    const preferences = defaultShortcutPreferences();
    preferences["canvas.fit"] = ["Mod+K"];
    preferences["canvas.save"] = ["Mod+R"];

    expect(shortcutConflicts(preferences)).toEqual([
      { binding: "Mod+K", actionIds: ["canvas.search", "canvas.fit"] },
    ]);
  });

  it("loads, saves, exports, and imports shortcut settings", () => {
    const writes: Record<string, string> = {};
    const storage = {
      getItem: (key: string) => writes[key] ?? null,
      setItem: (key: string, value: string) => {
        writes[key] = value;
      },
    };

    const preferences = defaultShortcutPreferences();
    preferences["canvas.fit"] = ["G"];
    saveShortcutPreferences(preferences, storage);
    saveCanvasPreferences({ gridVisible: false, snapToGrid: true, minimapVisible: true, defaultZoom: 2, defaultNodeWidth: 400, defaultNodeHeight: 260 }, storage);

    expect(loadShortcutPreferences(storage)["canvas.fit"]).toEqual(["G"]);
    expect(loadCanvasPreferences(storage)).toMatchObject({ gridVisible: false, snapToGrid: true });
    expect(writes[SHORTCUT_STORAGE_KEY]).toContain("canvas.fit");
    expect(writes[CANVAS_PREFERENCES_STORAGE_KEY]).toContain("defaultZoom");

    const exported = exportShortcutSettings({
      shortcuts: preferences,
      canvasPreferences: loadCanvasPreferences(storage),
    });
    expect(importShortcutSettings(exported).shortcuts["canvas.fit"]).toEqual(["G"]);
  });

  it("does not treat text inputs or contenteditable targets as shortcut surfaces", () => {
    const input = { tagName: "INPUT" } as unknown as EventTarget;
    const contentEditable = { tagName: "DIV", isContentEditable: true } as unknown as EventTarget;
    const button = { tagName: "BUTTON" } as unknown as EventTarget;

    expect(isEditableShortcutTarget(input)).toBe(true);
    expect(isEditableShortcutTarget(contentEditable)).toBe(true);
    expect(isEditableShortcutTarget(button)).toBe(false);
  });
});
