import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { ProjectDashboard } from "./project-dashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("../../lib/api", () => ({
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  duplicateProject: vi.fn(),
  listProjects: vi.fn(async () => []),
  updateProject: vi.fn(),
}));

describe("ProjectDashboard", () => {
  it("renders project controls and a canvas-directed project list", () => {
    const html = renderToStaticMarkup(
      <ProjectDashboard
        initialProjects={[
          {
            id: "project_1",
            ownerUserId: "default-user",
            title: "Pilot Project",
            defaultAspectRatio: "9:16",
            createdAt: "2026-06-12T00:00:00.000Z",
            updatedAt: "2026-06-12T00:00:00.000Z",
            assetCount: 2,
          },
        ]}
      />,
    );

    expect(html).toContain("Projects");
    expect(html).toContain("New project");
    expect(html).toContain("Pilot Project");
    expect(html).toContain("9:16");
    expect(html).toContain("Open canvas");
  });

  it("renders a usable empty state", () => {
    const html = renderToStaticMarkup(<ProjectDashboard initialProjects={[]} />);

    expect(html).toContain("No projects yet");
    expect(html).toContain("Create one to open the canvas workspace.");
  });
});
