import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type {
  AuthUserRecord,
  CurrentSessionResult,
  LoginInput,
  LoginResult,
} from "@guga-flow/shared-types";

import { readAppConfig } from "../config/app-config";
import { PrismaService } from "../prisma/prisma.service";

export const DEFAULT_ADMIN_USER_ID = "default-user";

type UserModel = {
  id: string;
  email: string | null;
  name: string | null;
  passwordHash: string | null;
};

type SessionPayload = {
  sub: string;
  email?: string;
  name?: string;
  iat: number;
  exp: number;
};

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async ensureDefaultAdmin(): Promise<UserModel> {
    const config = readAppConfig();
    const existing = (await this.prisma.user.findUnique({
      where: { id: DEFAULT_ADMIN_USER_ID },
    })) as UserModel | null;
    const passwordHash = existing?.passwordHash ?? hashPassword(config.defaultAdminPassword);

    if (existing) {
      return (await this.prisma.user.update({
        where: { id: DEFAULT_ADMIN_USER_ID },
        data: {
          email: config.defaultAdminEmail,
          name: existing.name ?? "Admin",
          passwordHash,
        },
      })) as UserModel;
    }

    return (await this.prisma.user.create({
      data: {
        id: DEFAULT_ADMIN_USER_ID,
        email: config.defaultAdminEmail,
        name: "Admin",
        passwordHash,
      },
    })) as UserModel;
  }

  async login(input: LoginInput): Promise<LoginResult> {
    await this.ensureDefaultAdmin();
    const email = normalizeEmail(input.email);
    const user = (await this.prisma.user.findFirst({
      where: { email },
    })) as UserModel | null;

    if (!user?.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
      throw new UnauthorizedException("Invalid email or password");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.createSession(user);
  }

  async currentSession(authorization: string | undefined): Promise<CurrentSessionResult> {
    const user = await this.authenticateAuthorization(authorization);
    if (!user) {
      return { authenticated: false };
    }
    const token = bearerToken(authorization);
    const payload = token ? verifySessionToken(token) : undefined;
    return {
      authenticated: true,
      user,
      ...(payload ? { expiresAt: new Date(payload.exp * 1000).toISOString() } : {}),
    };
  }

  async authenticateAuthorization(authorization: string | undefined): Promise<AuthUserRecord | undefined> {
    const token = bearerToken(authorization);
    if (!token) {
      return undefined;
    }
    const payload = verifySessionToken(token);
    if (!payload) {
      return undefined;
    }
    const user = (await this.prisma.user.findUnique({
      where: { id: payload.sub },
    })) as UserModel | null;
    if (!user) {
      return undefined;
    }
    return toAuthUser(user);
  }

  requireAuthorization(authorization: string | undefined): Promise<AuthUserRecord> {
    return this.authenticateAuthorization(authorization).then((user) => {
      if (!user) {
        throw new UnauthorizedException("Authentication required");
      }
      return user;
    });
  }

  private createSession(user: UserModel): LoginResult {
    const config = readAppConfig();
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + config.sessionTtlSeconds;
    return {
      token: signSessionToken({
        sub: user.id,
        ...(user.email ? { email: user.email } : {}),
        ...(user.name ? { name: user.name } : {}),
        iat: now,
        exp: expiresAt,
      }),
      user: toAuthUser(user),
      expiresAt: new Date(expiresAt * 1000).toISOString(),
    };
  }
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString("base64url");
  return `scrypt$16384$8$1$${salt}$${hash}`;
}

export function verifyPassword(password: string, encoded: string): boolean {
  const [algorithm, nValue, rValue, pValue, salt, expectedHash] = encoded.split("$");
  if (algorithm !== "scrypt" || !nValue || !rValue || !pValue || !salt || !expectedHash) {
    return false;
  }
  try {
    const hash = scryptSync(password, salt, 64, {
      N: Number(nValue),
      r: Number(rValue),
      p: Number(pValue),
    });
    const expected = Buffer.from(expectedHash, "base64url");
    return expected.length === hash.length && timingSafeEqual(expected, hash);
  } catch {
    return false;
  }
}

function signSessionToken(payload: SessionPayload): string {
  const header = base64UrlJson({ alg: "HS256", typ: "JWT" });
  const body = base64UrlJson(payload);
  const signature = createHmac("sha256", readAppConfig().sessionSecret)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

function verifySessionToken(token: string): SessionPayload | undefined {
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) {
    return undefined;
  }
  const expected = createHmac("sha256", readAppConfig().sessionSecret)
    .update(`${header}.${body}`)
    .digest("base64url");
  const received = Buffer.from(signature, "base64url");
  const expectedBuffer = Buffer.from(expected, "base64url");
  if (received.length !== expectedBuffer.length || !timingSafeEqual(received, expectedBuffer)) {
    return undefined;
  }
  const payload = parsePayload(body);
  if (!payload || payload.exp <= Math.floor(Date.now() / 1000)) {
    return undefined;
  }
  return payload;
}

function parsePayload(body: string): SessionPayload | undefined {
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<SessionPayload>;
    if (!parsed.sub || typeof parsed.exp !== "number" || typeof parsed.iat !== "number") {
      return undefined;
    }
    return parsed as SessionPayload;
  } catch {
    return undefined;
  }
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function bearerToken(authorization: string | undefined): string | undefined {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

function normalizeEmail(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function toAuthUser(user: UserModel): AuthUserRecord {
  return {
    id: user.id,
    ...(user.email ? { email: user.email } : {}),
    ...(user.name ? { name: user.name } : {}),
  };
}
