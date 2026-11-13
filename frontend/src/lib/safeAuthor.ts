export interface SafeAuthor {
  username: string;
  displayName: string;
  avatar: string;
  isVerified: boolean;
  level: string;
}

/** Normalize populated author data before using it in links or media URLs. */
export function normalizeAuthor(value: unknown): SafeAuthor | null {
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  const username = typeof record.username === 'string' ? record.username.trim() : '';
  if (!username) return null;

  const displayName = typeof record.displayName === 'string' ? record.displayName.trim() : '';
  const avatar = typeof record.avatar === 'string' ? record.avatar : '';
  const level = typeof record.level === 'string' ? record.level.trim() : '';

  return {
    username,
    displayName,
    avatar,
    isVerified: record.isVerified === true,
    level,
  };
}
