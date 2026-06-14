export const AUTH_TOKEN_STORAGE_KEY = "guga-flow-auth-token";

let memoryToken: string | null = null;

export function getAuthToken(): string | undefined {
  if (typeof window !== "undefined") {
    const storedToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    return storedToken || memoryToken || undefined;
  }
  return memoryToken || undefined;
}

export function setAuthToken(token: string | null | undefined): void {
  const normalizedToken = token?.trim() || null;
  memoryToken = normalizedToken;

  if (typeof window === "undefined") {
    return;
  }

  if (normalizedToken) {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, normalizedToken);
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
}

export function clearAuthToken(): void {
  setAuthToken(null);
}
