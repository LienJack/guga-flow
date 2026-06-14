export interface AuthUserRecord {
  id: string;
  email?: string;
  name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthSessionRecord {
  token: string;
  user: AuthUserRecord;
  expiresAt: string;
}

export type LoginResult = AuthSessionRecord;

export interface CurrentSessionResult {
  authenticated: boolean;
  user?: AuthUserRecord;
  expiresAt?: string;
}

export interface LogoutResult {
  ok: true;
}
