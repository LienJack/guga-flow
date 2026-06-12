import { Controller, Get, Inject } from "@nestjs/common";

import { ProvidersService } from "./providers.service";

@Controller("providers")
export class ProvidersController {
  constructor(@Inject(ProvidersService) private readonly providersService: ProvidersService) {}

  @Get("image")
  listImageProviders() {
    return this.providersService.getImageProviders();
  }
}
