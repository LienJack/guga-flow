import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";

import { AuthService } from "./auth.service";

type AuthenticatedRequest = Request & {
  authUser?: Awaited<ReturnType<AuthService["authenticateAuthorization"]>>;
};

@Injectable()
export class BrowserAuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (isPublicBrowserPath(request)) {
      return true;
    }
    const user = await this.authService.authenticateAuthorization(request.headers.authorization);
    if (!user) {
      throw new UnauthorizedException("Authentication required");
    }
    request.authUser = user;
    return true;
  }
}

function isPublicBrowserPath(request: Request): boolean {
  if (request.method === "OPTIONS") {
    return true;
  }
  const path = stripApiPrefix((request.path || request.url || "").split("?")[0] ?? "");
  if (path === "/health" || path.startsWith("/auth/") || path === "/auth") {
    return true;
  }
  if (path.startsWith("/worker/")) {
    return true;
  }
  if (path.startsWith("/providers/")) {
    return true;
  }
  return !path.startsWith("/projects");
}

function stripApiPrefix(path: string): string {
  return path.replace(/^\/api\/v1/, "");
}
