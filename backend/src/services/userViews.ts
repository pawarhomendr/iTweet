import type { IUser } from '../models/User';

/** Fields intentionally safe for unauthenticated profile, search, and network responses. */
export const PUBLIC_USER_FIELDS = [
  '_id',
  'username',
  'displayName',
  'bio',
  'avatar',
  'coverImage',
  'website',
  'isVerified',
  'points',
  'level',
  'badges',
  'followersCount',
  'followingCount',
  'postsCount',
] as const;

export const PUBLIC_USER_SELECT = PUBLIC_USER_FIELDS
  .filter((field) => field !== '_id')
  .join(' ');

export type PublicUser = Pick<IUser,
  | '_id'
  | 'username'
  | 'displayName'
  | 'bio'
  | 'avatar'
  | 'coverImage'
  | 'website'
  | 'isVerified'
  | 'points'
  | 'level'
  | 'badges'
  | 'followersCount'
  | 'followingCount'
  | 'postsCount'
>;

export function toPublicUser(user: IUser | Record<string, unknown>): Record<string, unknown> {
  const source = typeof (user as IUser).toObject === 'function'
    ? (user as IUser).toObject() as Record<string, unknown>
    : user as Record<string, unknown>;

  return Object.fromEntries(
    PUBLIC_USER_FIELDS
      .filter((field) => field in source)
      .map((field) => [field, source[field]])
  );
}
