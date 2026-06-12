import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";

import { WorkbenchShell } from "./workbench-shell";

describe("WorkbenchShell", () => {
  it("renders the canvas-first workbench regions", () => {
    const html = renderToStaticMarkup(<WorkbenchShell />);

    expect(html).toContain("Workspace");
    expect(html).toContain("Canvas");
    expect(html).toContain("Inspector");
    expect(html).toContain("Queue");
  });

  it("renders in mock mode without provider credentials", () => {
    const html = renderToStaticMarkup(<WorkbenchShell />);

    expect(html).toContain("Provider mode");
    expect(html).toContain("Mock");
  });
});
