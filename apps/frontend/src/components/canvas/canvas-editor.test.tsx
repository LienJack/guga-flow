import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { CanvasEditor } from "./canvas-editor";
import { CanvasSaveStatusBadge } from "./canvas-save-status";

vi.mock("tldraw", () => ({
  HTMLContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Rectangle2d: class Rectangle2d {
    constructor(readonly options: unknown) {}
  },
  ShapeUtil: class ShapeUtil {},
  T: {
    literalEnum: (...values: unknown[]) => ({ values }),
    number: { type: "number" },
    string: { type: "string" },
  },
  Tldraw: () => <div>Mock tldraw</div>,
  createShapeId: (id: string) => `shape:${id}`,
  resizeBox: (shape: unknown) => shape,
}));

vi.mock("../../lib/api", () => ({
  createCanvasNode: vi.fn(),
  deleteCanvasEdge: vi.fn(),
  deleteCanvasNode: vi.fn(),
  getProjectCanvas: vi.fn(async () => ({
    canvasDocument: {
      id: "canvas_1",
      projectId: "project_1",
      snapshotJson: {},
      createdAt: "2026-06-12T00:00:00.000Z",
      updatedAt: "2026-06-12T00:00:00.000Z",
    },
    nodes: [],
    edges: [],
    assets: [],
  })),
  saveCanvasSnapshot: vi.fn(),
  updateCanvasNodeGeometry: vi.fn(),
}));

describe("CanvasEditor", () => {
  it("renders a loading state before the client load completes", () => {
    const html = renderToStaticMarkup(<CanvasEditor projectId="project_1" />);

    expect(html).toContain("Loading canvas");
  });

  it("renders save status variants", () => {
    expect(renderToStaticMarkup(<CanvasSaveStatusBadge status="idle" />)).toContain("Ready");
    expect(renderToStaticMarkup(<CanvasSaveStatusBadge status="saving" />)).toContain("Saving");
    expect(renderToStaticMarkup(<CanvasSaveStatusBadge status="saved" />)).toContain("Saved");
    expect(
      renderToStaticMarkup(<CanvasSaveStatusBadge status="failed" error="offline" />),
    ).toContain("Save failed");
  });
});
