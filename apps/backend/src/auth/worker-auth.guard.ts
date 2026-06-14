import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";

import { readAppConfig } from "../config/app-config";

@Injectable()
export class WorkerAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const config = readAppConfig();
    if (!config.workerApiToken) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers["x-worker-token"];
    if (token === config.workerApiToken) {
      return true;
    }
    throw new UnauthorizedException("Worker token is invalid");
  }
}
