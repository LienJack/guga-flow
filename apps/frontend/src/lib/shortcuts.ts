export const SHORTCUT_STORAGE_KEY = "guga-flow-shortcuts";
export const CANVAS_PREFERENCES_STORAGE_KEY = "guga-flow-canvas-preferences";

export const SHORTCUT_ACTIONS = [
  {
    id: "canvas.search",
    category: "canvas",
    labelKey: "shortcuts.canvasSearch",
    defaultBindings: ["Mod+K", "/"],
  },
  {
    id: "canvas.fit",
    category: "canvas",
    labelKey: "shortcuts.canvasFit",
    defaultBindings: ["F"],
  },
  {
    id: "canvas.save",
    category: "canvas",
    labelKey: "shortcuts.canvasSave",
    defaultBindings: ["Mod+S"],
  },
  {
    id: "canvas.deleteSelection",
    category: "canvas",
    labelKey: "shortcuts.canvasDeleteSelection",
    defaultBindings: ["Delete", "Backspace"],
  },
  {
    id: "canvas.undo",
    category: "canvas",
    labelKey: "shortcuts.canvasUndo",
    defaultBindings: ["Mod+Z"],
  },
  {
    id: "canvas.redo",
    category: "canvas",
    labelKey: "shortcuts.canvasRedo",
    defaultBindings: ["Mod+Shift+Z"],
  },
] as const;

export type ShortcutAction = (typeof SHORTCUT_ACTIONS)[number];
export type ShortcutActionId = ShortcutAction["id"];
export type ShortcutPreferences = Record<ShortcutActionId, string[]>;

export interface CanvasPreferences {
  gridVisible: boolean;
  snapToGrid: boolean;
  minimapVisible: boolean;
  defaultZoom: number;
  defaultNodeWidth: number;
  defaultNodeHeight: number;
}

export interface ShortcutConflict {
  binding: string;
  actionIds: ShortcutActionId[];
}

export const DEFAULT_CANVAS_PREFERENCES: CanvasPreferences = {
  gridVisible: true,
  snapToGrid: false,
  minimapVisible: false,
  defaultZoom: 1,
  defaultNodeWidth: 320,
  defaultNodeHeight: 220,
};

const RESERVED_BROWSER_SHORTCUTS = new Set(["Mod+R", "Mod+L", "Mod+W"]);

export function defaultShortcutPreferences(): ShortcutPreferences {
  return Object.fromEntries(
    SHORTCUT_ACTIONS.map((action) => [action.id, [...action.defaultBindings]]),
  ) as ShortcutPreferences;
}

export function normalizeShortcutPreferences(value: unknown): ShortcutPreferences {
  const input = objectValue(value);
  const defaults = defaultShortcutPreferences();
  const result = { ...defaults };
  for (const action of SHORTCUT_ACTIONS) {
    const bindings = Array.isArray(input[action.id]) ? (input[action.id] as unknown[]) : undefined;
    if (!bindings) {
      continue;
    }
    const normalized = uniqueStrings(
      bindings.flatMap((binding) => {
        const value = normalizeShortcutBinding(binding);
        return value ? [value] : [];
      }),
    );
    if (normalized.length > 0) {
      result[action.id] = normalized;
    }
  }
  return result;
}

export function normalizeCanvasPreferences(value: unknown): CanvasPreferences {
  const input = objectValue(value);
  return {
    gridVisible: booleanValue(input.gridVisible) ?? DEFAULT_CANVAS_PREFERENCES.gridVisible,
    snapToGrid: booleanValue(input.snapToGrid) ?? DEFAULT_CANVAS_PREFERENCES.snapToGrid,
    minimapVisible: booleanValue(input.minimapVisible) ?? DEFAULT_CANVAS_PREFERENCES.minimapVisible,
    defaultZoom: numberInRange(input.defaultZoom, 0.25, 4) ?? DEFAULT_CANVAS_PREFERENCES.defaultZoom,
    defaultNodeWidth:
      numberInRange(input.defaultNodeWidth, 160, 960) ??
      DEFAULT_CANVAS_PREFERENCES.defaultNodeWidth,
    defaultNodeHeight:
      numberInRange(input.defaultNodeHeight, 120, 720) ??
      DEFAULT_CANVAS_PREFERENCES.defaultNodeHeight,
  };
}

export function loadShortcutPreferences(
  storage: Pick<Storage, "getItem"> | undefined = browserStorage(),
): ShortcutPreferences {
  const stored = storage?.getItem(SHORTCUT_STORAGE_KEY);
  if (!stored) {
    return defaultShortcutPreferences();
  }
  try {
    return normalizeShortcutPreferences(JSON.parse(stored));
  } catch {
    return defaultShortcutPreferences();
  }
}

export function saveShortcutPreferences(
  preferences: ShortcutPreferences,
  storage: Pick<Storage, "setItem"> | undefined = browserStorage(),
) {
  storage?.setItem(SHORTCUT_STORAGE_KEY, JSON.stringify(normalizeShortcutPreferences(preferences)));
}

export function loadCanvasPreferences(
  storage: Pick<Storage, "getItem"> | undefined = browserStorage(),
): CanvasPreferences {
  const stored = storage?.getItem(CANVAS_PREFERENCES_STORAGE_KEY);
  if (!stored) {
    return DEFAULT_CANVAS_PREFERENCES;
  }
  try {
    return normalizeCanvasPreferences(JSON.parse(stored));
  } catch {
    return DEFAULT_CANVAS_PREFERENCES;
  }
}

export function saveCanvasPreferences(
  preferences: CanvasPreferences,
  storage: Pick<Storage, "setItem"> | undefined = browserStorage(),
) {
  storage?.setItem(CANVAS_PREFERENCES_STORAGE_KEY, JSON.stringify(normalizeCanvasPreferences(preferences)));
}

export function exportShortcutSettings(input: {
  shortcuts: ShortcutPreferences;
  canvasPreferences: CanvasPreferences;
}) {
  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    shortcuts: normalizeShortcutPreferences(input.shortcuts),
    canvasPreferences: normalizeCanvasPreferences(input.canvasPreferences),
  };
}

export function importShortcutSettings(value: unknown): {
  shortcuts: ShortcutPreferences;
  canvasPreferences: CanvasPreferences;
} {
  const input = objectValue(value);
  return {
    shortcuts: normalizeShortcutPreferences(input.shortcuts ?? input),
    canvasPreferences: normalizeCanvasPreferences(input.canvasPreferences),
  };
}

export function shortcutConflicts(preferences: ShortcutPreferences): ShortcutConflict[] {
  const byBinding = new Map<string, ShortcutActionId[]>();
  for (const action of SHORTCUT_ACTIONS) {
    for (const binding of preferences[action.id] ?? []) {
      const normalized = normalizeShortcutBinding(binding);
      if (!normalized || RESERVED_BROWSER_SHORTCUTS.has(normalized)) {
        continue;
      }
      const actionIds = byBinding.get(normalized) ?? [];
      actionIds.push(action.id);
      byBinding.set(normalized, actionIds);
    }
  }
  return Array.from(byBinding.entries())
    .filter(([, actionIds]) => actionIds.length > 1)
    .map(([binding, actionIds]) => ({ binding, actionIds }));
}

export function eventMatchesShortcut(
  event: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey">,
  bindings: readonly string[],
): boolean {
  const eventBinding = keyboardEventToShortcut(event);
  return bindings.some((binding) => normalizeShortcutBinding(binding) === eventBinding);
}

export function keyboardEventToShortcut(
  event: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey">,
): string {
  const parts: string[] = [];
  if (event.metaKey || event.ctrlKey) {
    parts.push("Mod");
  }
  if (event.altKey) {
    parts.push("Alt");
  }
  if (event.shiftKey) {
    parts.push("Shift");
  }
  parts.push(normalizeKey(event.key));
  return parts.join("+");
}

export function normalizeShortcutBinding(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const parts = value
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return undefined;
  }
  const key = normalizeKey(parts[parts.length - 1] ?? "");
  if (!key) {
    return undefined;
  }
  const modifiers = uniqueStrings(
    parts
      .slice(0, -1)
      .map(normalizeModifier)
      .filter((part): part is string => Boolean(part)),
  );
  return [...modifierSort(modifiers), key].join("+");
}

export function isEditableShortcutTarget(target: EventTarget | null): boolean {
  if (typeof target !== "object" || target === null) {
    return false;
  }
  const candidate = target as { isContentEditable?: boolean; tagName?: string };
  if (candidate.isContentEditable) {
    return true;
  }
  const tagName = candidate.tagName?.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select";
}

function normalizeModifier(value: string): string | undefined {
  const lower = value.toLowerCase();
  if (lower === "mod" || lower === "meta" || lower === "cmd" || lower === "command" || lower === "ctrl" || lower === "control") {
    return "Mod";
  }
  if (lower === "alt" || lower === "option") {
    return "Alt";
  }
  if (lower === "shift") {
    return "Shift";
  }
  return undefined;
}

function normalizeKey(value: string): string {
  if (value === " ") {
    return "Space";
  }
  if (value.length === 1) {
    return value === "/" ? "/" : value.toUpperCase();
  }
  const lower = value.toLowerCase();
  if (lower === "esc") {
    return "Escape";
  }
  if (lower === "del") {
    return "Delete";
  }
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function modifierSort(modifiers: string[]): string[] {
  const order = new Map([
    ["Mod", 0],
    ["Alt", 1],
    ["Shift", 2],
  ]);
  return [...modifiers].sort((left, right) => (order.get(left) ?? 99) - (order.get(right) ?? 99));
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function objectValue(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function numberInRange(value: unknown, min: number, max: number): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
    ? value
    : undefined;
}

function browserStorage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}
