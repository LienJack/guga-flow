import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { LoginPanel } from "./login-panel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("../../lib/api", () => ({
  getCurrentSession: vi.fn(async () => ({ authenticated: false })),
  login: vi.fn(),
}));

describe("LoginPanel", () => {
  it("renders the single-user login form", () => {
    const html = renderToStaticMarkup(<LoginPanel />);

    expect(html).toContain("GugaFlow");
    expect(html).toContain("Sign in");
    expect(html).toContain('name="email"');
    expect(html).toContain('name="password"');
    expect(html).toContain("Account");
    expect(html).toContain('type="text"');
    expect(html).toContain("admin");
  });
});
