import type { LoginInput } from "@guga-flow/shared-types";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class LoginDto implements LoginInput {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password!: string;
}
