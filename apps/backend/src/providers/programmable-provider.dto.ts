import { IsString, MaxLength, MinLength } from "class-validator";
import type {
  ActivateProgrammableProviderVersionInput,
  CreateProgrammableProviderInput,
  UpdateProgrammableProviderSourceInput,
} from "@guga-flow/shared-types";

export class CreateProgrammableProviderDto implements CreateProgrammableProviderInput {
  @IsString()
  @MinLength(1)
  @MaxLength(100_000)
  sourceCode!: string;
}

export class UpdateProgrammableProviderSourceDto implements UpdateProgrammableProviderSourceInput {
  @IsString()
  @MinLength(1)
  @MaxLength(100_000)
  sourceCode!: string;
}

export class ActivateProgrammableProviderVersionDto implements ActivateProgrammableProviderVersionInput {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  versionId!: string;
}
