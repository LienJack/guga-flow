import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createCanvasAutosaveController } from "./canvas-autosave";

describe("createCanvasAutosaveController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces snapshot saves and reports saved state", async () => {
    const saveSnapshot = vi.fn(async () => undefined);
    const statuses: string[] = [];
    const controller = createCanvasAutosaveController({
      projectId: "project_1",
      debounceMs: 500,
      saveSnapshot,
      onStatusChange: (status) => statuses.push(status),
    });

    controller.schedule({ document: { records: [] }, session: null });
    expect(saveSnapshot).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);

    expect(saveSnapshot).toHaveBeenCalledWith("project_1", {
      document: { records: [] },
      session: null,
    });
    expect(statuses).toEqual(["saving", "saved"]);
  });

  it("saves only the latest snapshot when changes repeat inside the debounce window", async () => {
    const saveSnapshot = vi.fn(async () => undefined);
    const controller = createCanvasAutosaveController({
      projectId: "project_1",
      debounceMs: 500,
      saveSnapshot,
    });

    controller.schedule({ document: { records: ["old"] } });
    await vi.advanceTimersByTimeAsync(250);
    controller.schedule({ document: { records: ["latest"] } });
    await vi.advanceTimersByTimeAsync(250);
    expect(saveSnapshot).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(250);

    expect(saveSnapshot).toHaveBeenCalledTimes(1);
    expect(saveSnapshot).toHaveBeenCalledWith("project_1", {
      document: { records: ["latest"] },
    });
  });

  it("keeps failed snapshots available for retry", async () => {
    const saveSnapshot = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(undefined);
    const statuses: string[] = [];
    const errors: (string | null)[] = [];
    const controller = createCanvasAutosaveController({
      projectId: "project_1",
      debounceMs: 500,
      saveSnapshot,
      onStatusChange: (status) => statuses.push(status),
      onErrorChange: (error) => errors.push(error),
    });

    controller.schedule({ document: { records: ["shape"] } });
    await vi.advanceTimersByTimeAsync(500);

    expect(statuses).toEqual(["saving", "failed"]);
    expect(errors).toEqual(["network down"]);

    await controller.retry();

    expect(saveSnapshot).toHaveBeenLastCalledWith("project_1", {
      document: { records: ["shape"] },
    });
    expect(statuses).toEqual(["saving", "failed", "saving", "saved"]);
    expect(errors).toEqual(["network down", null]);
  });

  it("clears pending saves when the project changes", async () => {
    const saveSnapshot = vi.fn(async () => undefined);
    const statuses: string[] = [];
    const controller = createCanvasAutosaveController({
      projectId: "project_1",
      debounceMs: 500,
      saveSnapshot,
      onStatusChange: (status) => statuses.push(status),
    });

    controller.schedule({ document: { records: ["project_1"] } });
    controller.reset("project_2");
    await vi.advanceTimersByTimeAsync(500);
    expect(saveSnapshot).not.toHaveBeenCalled();

    controller.schedule({ document: { records: ["project_2"] } });
    await vi.advanceTimersByTimeAsync(500);

    expect(saveSnapshot).toHaveBeenCalledWith("project_2", {
      document: { records: ["project_2"] },
    });
    expect(statuses).toEqual(["idle", "saving", "saved"]);
  });

  it("persists the latest pending snapshot when disposed before debounce fires", () => {
    const saveSnapshot = vi.fn(async () => undefined);
    const statuses: string[] = [];
    const controller = createCanvasAutosaveController({
      projectId: "project_1",
      debounceMs: 500,
      saveSnapshot,
      onStatusChange: (status) => statuses.push(status),
    });

    controller.schedule({ document: { records: ["pending"] } });
    controller.dispose();

    expect(saveSnapshot).toHaveBeenCalledWith("project_1", {
      document: { records: ["pending"] },
    });
    expect(statuses).toEqual([]);
  });

  it("does not let stale save failures overwrite a newer pending snapshot", async () => {
    let rejectFirstSave: ((error: Error) => void) | undefined;
    const saveSnapshot = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectFirstSave = reject;
          }),
      )
      .mockResolvedValueOnce(undefined);
    const statuses: string[] = [];
    const controller = createCanvasAutosaveController({
      projectId: "project_1",
      debounceMs: 500,
      saveSnapshot,
      onStatusChange: (status) => statuses.push(status),
    });

    controller.schedule({ document: { records: ["old"] } });
    await vi.advanceTimersByTimeAsync(500);
    controller.schedule({ document: { records: ["latest"] } });
    rejectFirstSave?.(new Error("old save failed"));
    await vi.runOnlyPendingTimersAsync();

    expect(saveSnapshot).toHaveBeenLastCalledWith("project_1", {
      document: { records: ["latest"] },
    });
    expect(statuses).toEqual(["saving", "saving", "saved"]);
  });
});
