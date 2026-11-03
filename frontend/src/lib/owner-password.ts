export function ownerPasswordsMatch(password: string, confirmation: string): boolean {
  return password.trim().length > 0 && password === confirmation;
}

export const OWNER_PASSWORD_MIN_LENGTH = 6;

export function isValidOwnerPassword(password: string): boolean {
  return password.trim().length >= OWNER_PASSWORD_MIN_LENGTH;
}
