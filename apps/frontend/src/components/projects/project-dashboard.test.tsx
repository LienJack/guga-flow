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
  isUnauthorizedError: vi.fn(() => false),
  listProjects: vi.fn(async () => []),
  logout: vi.fn(async () => ({ ok: true })),
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
    expect(html).toContain('aria-label="Open Pilot Project canvas"');
    expect(html).toContain('aria-label="Edit Pilot Project"');
    expect(html).toContain('aria-label="Duplicate Pilot Project"');
    expect(html).toContain('aria-label="Delete Pilot Project"');
    expect(html).toContain('aria-label="Scripts"');
    expect(html).toContain('aria-label="Settings"');
    expect(html).toContain("Log out");
    expect(html).toContain('disabled=""');
  });

  it("renders a usable empty state", () => {
    const html = renderToStaticMarkup(<ProjectDashboard initialProjects={[]} />);

    expect(html).toContain("No projects yet");
    expect(html).toContain("Create one to open the canvas workspace.");
  });

  it("prefills the new project form from an initial draft", () => {
    const html = renderToStaticMarkup(
      <ProjectDashboard
        initialProjects={[]}
        initialDraft={{
          title: "222",
          description: "2222",
          defaultAspectRatio: "9:16",
        }}
      />,
    );

    expect(html).toContain('name="title"');
    expect(html).toContain('value="222"');
    expect(html).toContain("2222");
    expect(html).toContain('<option value="9:16" selected="">9:16</option>');
  });
});
