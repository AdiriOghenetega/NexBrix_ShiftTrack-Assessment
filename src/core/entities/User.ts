/** User + session domain entities. */

export type UserRole = 'staff' | 'manager';

export interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: UserRole;
}

export interface AuthSession {
  readonly token: string;
  /** ISO-8601 timestamp of when the token was issued. */
  readonly issuedAt: string;
  readonly user: User;
}

const USER_ROLES: readonly UserRole[] = ['staff', 'manager'];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}

/** First-name style greeting label. */
export function displayName(user: User): string {
  const firstName = user.name.trim().split(/\s+/)[0];
  return firstName && firstName.length > 0 ? firstName : user.email;
}

/** Two-letter initials for the avatar chip. */
export function initials(user: User): string {
  const parts = user.name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? user.email[0] ?? '?';
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${second}`.toUpperCase();
}
