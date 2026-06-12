import { PHASE_3_CANVAS_NODE_TYPES } from "@guga-flow/shared-types";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";

import { getBusinessNodeDefinition } from "./business-node-data";
import { BusinessNodeCard } from "./business-node-card";
import {
  BUSINESS_NODE_SHAPE_TYPE_BY_NODE_TYPE,
  buildBusinessNodeShapeProps,
} from "./business-node-shape";
import { businessNodeShapeUtils } from "./business-node-shape-utils";

describe("BusinessNodeCard", () => {
  it("renders every Phase 3 business node card variant", () => {
    for (const nodeType of PHASE_3_CANVAS_NODE_TYPES) {
      const definition = getBusinessNodeDefinition(nodeType);
      const html = renderToStaticMarkup(
        <BusinessNodeCard
          nodeId={`node_${nodeType}`}
          nodeType={nodeType}
          title={definition.defaultTitle}
          status="draft"
          summary={definition.summaryFallback}
          detail={definition.detailFallback}
          w={360}
          h={220}
        />,
      );

      expect(html).toContain(definition.shortLabel);
      expect(html).toContain(definition.defaultTitle);
      expect(html).toContain(definition.summaryFallback);
    }
  });

  it("uses prefixed tldraw shape types for business nodes", () => {
    const shapeTypes = businessNodeShapeUtils.map((ShapeUtil) => ShapeUtil.type);

    expect(shapeTypes).toContain("business_video");
    expect(shapeTypes).not.toContain("video");
    expect(BUSINESS_NODE_SHAPE_TYPE_BY_NODE_TYPE.shot).toBe("business_shot");
    expect(new Set(shapeTypes).size).toBe(PHASE_3_CANVAS_NODE_TYPES.length);
  });

  it("builds shape props from normalized canvas nodes", () => {
    const props = buildBusinessNodeShapeProps({
      id: "node_1",
      projectId: "project_1",
      canvasDocumentId: "canvas_1",
      tldrawShapeId: "shape:shot-1",
      type: "shot",
      title: "Shot 001",
      x: 10,
      y: 20,
      width: 360,
      height: 220,
      zIndex: 0,
      status: "draft",
      dataJson: {
        visualDescription: "Wide shot of the launch platform.",
        cameraMovement: "Slow push-in",
      },
      createdAt: "2026-06-12T00:00:00.000Z",
      updatedAt: "2026-06-12T00:00:00.000Z",
    });

    expect(props).toMatchObject({
      nodeId: "node_1",
      nodeType: "shot",
      title: "Shot 001",
      summary: "Wide shot of the launch platform.",
      detail: "Slow push-in",
      w: 360,
      h: 220,
    });
  });
});
