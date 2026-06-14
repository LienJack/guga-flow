import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { WorkbenchShell } from "./workbench-shell";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("../lib/api", () => ({
  logout: vi.fn(async () => ({ ok: true })),
}));

describe("WorkbenchShell", () => {
  it("renders the canvas-first workbench regions", () => {
    const html = renderToStaticMarkup(<WorkbenchShell />);

    expect(html).toContain("Workspace");
    expect(html).toContain("Canvas");
    expect(html).toContain("Inspector");
    expect(html).toContain("Queue");
    expect(html).toContain("EN");
    expect(html).toContain("中文");
    expect(html).toContain("Logout");
    expect(html).toContain('aria-label="Storyboard"');
  });

  it("renders in mock mode without provider credentials", () => {
    const html = renderToStaticMarkup(<WorkbenchShell />);

    expect(html).toContain("Provider mode");
    expect(html).toContain("Mock");
  });

  it("renders injected canvas and save status slots", () => {
    const html = renderToStaticMarkup(
      <WorkbenchShell
        canvasSlot={<div>Persistent canvas</div>}
        sidebarSlot={<div>Novel storyboard panel</div>}
        saveStateSlot={<div className="save-state">Saving</div>}
        storyboardEnabled
      />,
    );

    expect(html).toContain("Persistent canvas");
    expect(html).toContain("Novel storyboard panel");
    expect(html).toContain("Saving");
    expect(html).toContain("tool-button active");
    expect(html).not.toContain("NovelNode");
  });
});
