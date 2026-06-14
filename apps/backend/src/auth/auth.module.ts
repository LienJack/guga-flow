import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { BrowserAuthGuard } from "./browser-auth.guard";
import { WorkerAuthGuard } from "./worker-auth.guard";

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    WorkerAuthGuard,
    {
      provide: APP_GUARD,
      useClass: BrowserAuthGuard,
    },
  ],
  exports: [AuthService, WorkerAuthGuard],
})
export class AuthModule {}
