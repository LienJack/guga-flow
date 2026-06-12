import { describe, expect, it } from "vitest";

import { readAppConfig } from "../config/app-config";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("reports mock provider mode without exposing provider secrets", () => {
    const controller = new HealthController();
    const health = controller.getHealth();

    expect(health.status).toBe("ok");
    expect(health.providerMode.llm.selected).toBe("mock");
    expect(JSON.stringify(health)).not.toContain("API_KEY");
  });

  it("fails fast for invalid numeric configuration", () => {
    expect(() => readAppConfig({ PORT: "not-a-port" })).toThrow("PORT must be a positive integer");
  });
});
