import { describe, expect, it } from "vitest";

import {
  CANVAS_EDGE_RELATIONS,
  CANVAS_NODE_TYPES,
  GENERATION_JOB_STATUSES,
  GENERATION_OPERATIONS,
} from "../index";

describe("shared domain constants", () => {
  it("includes MVP canvas node and edge concepts", () => {
    expect(CANVAS_NODE_TYPES).toContain("shot");
    expect(CANVAS_NODE_TYPES).toContain("editor_package");
    expect(CANVAS_EDGE_RELATIONS).toContain("generated_image");
    expect(CANVAS_EDGE_RELATIONS).toContain("generated_video");
    expect(CANVAS_EDGE_RELATIONS).toContain("sent_to_editor");
  });

  it("models worker-visible generation lifecycle states", () => {
    expect(GENERATION_JOB_STATUSES).toEqual(
      expect.arrayContaining(["queued", "running", "provider_waiting", "succeeded", "failed"]),
    );
    expect(GENERATION_OPERATIONS).toContain("novel_to_storyboard");
    expect(GENERATION_OPERATIONS).toContain("editor_export");
  });
});
