import { describe, expect, it } from "vitest";

import { backendWorkerBaseUrlFromEnv } from "./generation-client";

describe("generation worker client configuration", () => {
  it("defaults to the backend development API port", () => {
    expect(backendWorkerBaseUrlFromEnv({})).toBe("http://localhost:3002/api/v1");
  });

  it("prefers explicit internal backend URLs over legacy backend URLs", () => {
    expect(
      backendWorkerBaseUrlFromEnv({
        BACKEND_INTERNAL_URL: "http://backend:3002/api/v1",
        BACKEND_URL: "http://localhost:3002/api/v1",
      }),
    ).toBe("http://backend:3002/api/v1");
  });
});
