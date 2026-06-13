import { IsBoolean, IsIn, IsObject, IsOptional, IsString, MaxLength } from "class-validator";

import { MANAGED_PROVIDER_KINDS, PROVIDER_CREDENTIAL_UPDATE_ACTIONS } from "@guga-flow/shared-types";
import type {
  ManagedProviderKind,
  ProviderCredentialUpdate,
  ProviderConnectionTestInput,
  UpdateProviderConfigInput,
} from "@guga-flow/shared-types";

export class ProviderCredentialUpdateDto implements ProviderCredentialUpdate {
  @IsIn(PROVIDER_CREDENTIAL_UPDATE_ACTIONS)
  action!: ProviderCredentialUpdate["action"];

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  value?: string;
}

export class UpdateProviderConfigDto implements UpdateProviderConfigInput {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  defaultModel?: string;

  @IsOptional()
  @IsObject()
  credential?: ProviderCredentialUpdateDto;
}

export class ProviderConnectionTestDto implements ProviderConnectionTestInput {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  model?: string;
}

export class ProviderKindParamDto {
  @IsIn(MANAGED_PROVIDER_KINDS)
  kind!: ManagedProviderKind;
}
