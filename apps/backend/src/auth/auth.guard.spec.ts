import { UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AuthService } from "./auth.service";
import { BrowserAuthGuard } from "./browser-auth.guard";
import { WorkerAuthGuard } from "./worker-auth.guard";

function httpContext(path: string, headers: Record<string, string> = {}, method = "GET"): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers,
        method,
        path,
        url: path,
      }),
    }),
  } as unknown as ExecutionContext;
}

function createAuthServiceMock(user?: { id: string }) {
  return {
    authenticateAuthorization: vi.fn(async () => user),
  };
}

describe("auth guards", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows auth, health, provider catalog, and worker paths without browser session", async () => {
    const authService = createAuthServiceMock();
    const guard = new BrowserAuthGuard(authService as unknown as AuthService);

    await expect(guard.canActivate(httpContext("/api/v1/auth/login"))).resolves.toBe(true);
    await expect(guard.canActivate(httpContext("/api/v1/health"))).resolves.toBe(true);
    await expect(guard.canActivate(httpContext("/api/v1/providers/llm"))).resolves.toBe(true);
    await expect(guard.canActivate(httpContext("/api/v1/worker/generation/jobs/claim"))).resolves.toBe(true);
    expect(authService.authenticateAuthorization).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated project API calls and attaches authenticated users", async () => {
    const missingAuth = createAuthServiceMock();
    const missingGuard = new BrowserAuthGuard(missingAuth as unknown as AuthService);

    await expect(missingGuard.canActivate(httpContext("/api/v1/projects"))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    const authService = createAuthServiceMock({ id: "default-user" });
    const guard = new BrowserAuthGuard(authService as unknown as AuthService);
    await expect(
      guard.canActivate(httpContext("/api/v1/projects", { authorization: "Bearer token" })),
    ).resolves.toBe(true);
    expect(authService.authenticateAuthorization).toHaveBeenCalledWith("Bearer token");
  });

  it("keeps worker authorization on x-worker-token when configured", () => {
    const guard = new WorkerAuthGuard();
    vi.stubEnv("WORKER_API_TOKEN", "worker-secret");

    expect(() =>
      guard.canActivate(httpContext("/api/v1/worker/generation/jobs/claim")),
    ).toThrow(UnauthorizedException);
    expect(
      guard.canActivate(
        httpContext("/api/v1/worker/generation/jobs/claim", { "x-worker-token": "worker-secret" }),
      ),
    ).toBe(true);
  });

  it("keeps worker endpoints open for local development when no token is configured", () => {
    const guard = new WorkerAuthGuard();

    expect(guard.canActivate(httpContext("/api/v1/worker/generation/jobs/claim"))).toBe(true);
  });
});
