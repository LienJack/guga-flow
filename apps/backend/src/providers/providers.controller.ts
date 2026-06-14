import { Body, Controller, Get, Inject, Param, Patch, Post } from "@nestjs/common";

import { ProviderConnectionTestDto, ProviderModelDiscoveryDto, UpdateProviderConfigDto } from "./dto";
import {
  ActivateProgrammableProviderVersionDto,
  CreateProgrammableProviderDto,
  UpdateProgrammableProviderSourceDto,
} from "./programmable-provider.dto";
import { ProvidersService } from "./providers.service";

@Controller("providers")
export class ProvidersController {
  constructor(@Inject(ProvidersService) private readonly providersService: ProvidersService) {}

  @Get("llm")
  listLlmProviders() {
    return this.providersService.getLlmProviders();
  }

  @Get("image")
  listImageProviders() {
    return this.providersService.getImageProviders();
  }

  @Get("video")
  listVideoProviders() {
    return this.providersService.getVideoProviders();
  }
}

@Controller("projects/:projectId/providers")
export class ProjectProvidersController {
  constructor(@Inject(ProvidersService) private readonly providersService: ProvidersService) {}

  @Get()
  listProviderManagement(@Param("projectId") projectId: string) {
    return this.providersService.getProviderManagement(projectId);
  }

  @Get("llm")
  listProjectLlmProviders(@Param("projectId") projectId: string) {
    return this.providersService.getProjectLlmProviders(projectId);
  }

  @Get("image")
  listProjectImageProviders(@Param("projectId") projectId: string) {
    return this.providersService.getProjectImageProviders(projectId);
  }

  @Get("video")
  listProjectVideoProviders(@Param("projectId") projectId: string) {
    return this.providersService.getProjectVideoProviders(projectId);
  }

  @Get("programmable")
  listProgrammableProviders(@Param("projectId") projectId: string) {
    return this.providersService.listProgrammableProviders(projectId);
  }

  @Post("discover-models")
  discoverModels(@Param("projectId") projectId: string, @Body() body: ProviderModelDiscoveryDto) {
    return this.providersService.discoverModels(projectId, body);
  }

  @Post("programmable")
  createProgrammableProvider(
    @Param("projectId") projectId: string,
    @Body() body: CreateProgrammableProviderDto,
  ) {
    return this.providersService.createProgrammableProvider(projectId, body);
  }

  @Patch("programmable/:kind/:provider/source")
  updateProgrammableProviderSource(
    @Param("projectId") projectId: string,
    @Param("kind") kind: string,
    @Param("provider") provider: string,
    @Body() body: UpdateProgrammableProviderSourceDto,
  ) {
    return this.providersService.updateProgrammableProviderSource(projectId, kind, provider, body);
  }

  @Post("programmable/:kind/:provider/activate")
  activateProgrammableProviderVersion(
    @Param("projectId") projectId: string,
    @Param("kind") kind: string,
    @Param("provider") provider: string,
    @Body() body: ActivateProgrammableProviderVersionDto,
  ) {
    return this.providersService.activateProgrammableProviderVersion(
      projectId,
      kind,
      provider,
      body.versionId,
    );
  }

  @Post("programmable/:kind/:provider/disable")
  disableProgrammableProvider(
    @Param("projectId") projectId: string,
    @Param("kind") kind: string,
    @Param("provider") provider: string,
  ) {
    return this.providersService.disableProgrammableProvider(projectId, kind, provider);
  }

  @Patch(":kind/:provider")
  updateProviderConfig(
    @Param("projectId") projectId: string,
    @Param("kind") kind: string,
    @Param("provider") provider: string,
    @Body() body: UpdateProviderConfigDto,
  ) {
    return this.providersService.updateProviderConfig(projectId, kind, provider, body);
  }

  @Post(":kind/:provider/test")
  testProviderConfig(
    @Param("projectId") projectId: string,
    @Param("kind") kind: string,
    @Param("provider") provider: string,
    @Body() _body: ProviderConnectionTestDto,
  ) {
    return this.providersService.testProviderConfig(projectId, kind, provider, _body);
  }
}
