import { UnauthorizedException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../prisma/prisma.service";
import { AuthService, DEFAULT_ADMIN_USER_ID, hashPassword, verifyPassword } from "./auth.service";

const now = new Date("2026-06-14T00:00:00.000Z");

function user(overrides: Record<string, unknown> = {}) {
  return {
    id: DEFAULT_ADMIN_USER_ID,
    email: "admin",
    name: "Admin",
    passwordHash: hashPassword("admin"),
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createPrismaMock() {
  let currentUser: ReturnType<typeof user> | null = null;
  return {
    user: {
      findUnique: vi.fn(async (args: { where: { id?: string } }) =>
        args.where.id === currentUser?.id ? currentUser : null,
      ),
      findFirst: vi.fn(async (args: { where: { email?: string } }) =>
        args.where.email === currentUser?.email ? currentUser : null,
      ),
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        currentUser = user(args.data);
        return currentUser;
      }),
      update: vi.fn(async (args: { data: Record<string, unknown> }) => {
        currentUser = user({
          ...currentUser,
          ...args.data,
        });
        return currentUser;
      }),
    },
  };
}

describe("AuthService", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: AuthService;

  beforeEach(() => {
    vi.stubEnv("AUTH_SESSION_SECRET", "test-session-secret");
    vi.stubEnv("DEFAULT_ADMIN_EMAIL", "admin");
    vi.stubEnv("DEFAULT_ADMIN_PASSWORD", "admin");
    prisma = createPrismaMock();
    service = new AuthService(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("hashes passwords with a non-plaintext verifier", () => {
    const hash = hashPassword("correct horse");

    expect(hash).not.toContain("correct horse");
    expect(verifyPassword("correct horse", hash)).toBe(true);
    expect(verifyPassword("wrong horse", hash)).toBe(false);
    expect(verifyPassword("correct horse", "scrypt$bad$8$1$salt$hash")).toBe(false);
  });

  it("seeds the default admin and returns a signed session on login", async () => {
    const result = await service.login({
      email: "ADMIN ",
      password: "admin",
    });

    expect(result.user).toMatchObject({
      id: DEFAULT_ADMIN_USER_ID,
      email: "admin",
    });
    expect(result.token.split(".")).toHaveLength(3);
    expect(prisma.user.create).toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: DEFAULT_ADMIN_USER_ID },
      data: { lastLoginAt: expect.any(Date) },
    });
  });

  it("reads the current session from a valid bearer token", async () => {
    const login = await service.login({
      email: "admin",
      password: "admin",
    });

    const session = await service.currentSession(`Bearer ${login.token}`);

    expect(session.authenticated).toBe(true);
    expect(session.user?.id).toBe(DEFAULT_ADMIN_USER_ID);
    expect(session.expiresAt).toBe(login.expiresAt);
  });

  it("rejects invalid credentials and malformed session tokens", async () => {
    await service.ensureDefaultAdmin();

    await expect(
      service.login({ email: "admin", password: "wrong" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.requireAuthorization("Bearer broken")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
