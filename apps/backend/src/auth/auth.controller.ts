import { Body, Controller, Get, Headers, Inject, Post } from "@nestjs/common";
import type { LogoutResult } from "@guga-flow/shared-types";

import { AuthService } from "./auth.service";
import { LoginDto } from "./dto";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post("login")
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Get("session")
  session(@Headers("authorization") authorization?: string) {
    return this.authService.currentSession(authorization);
  }

  @Post("logout")
  logout(): LogoutResult {
    return { ok: true };
  }
}
