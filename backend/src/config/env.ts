export const MIN_PRODUCTION_SECRET_LENGTH = 32;
const MIN_UNIQUE_SECRET_CHARACTERS = 8;

const KNOWN_PLACEHOLDER_VALUES = new Set([
  'secret',
  'password',
  'default',
  'example',
  'sample',
  'placeholder',
  'test',
  'development',
  'production',
  'jwt_secret',
  'refresh_token_secret',
]);

function isPlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return KNOWN_PLACEHOLDER_VALUES.has(normalized)
    || normalized.startsWith('replace_with')
    || normalized.startsWith('replace-with')
    || normalized.startsWith('your_')
    || normalized.startsWith('your-')
    || normalized.startsWith('your secret')
    || normalized.startsWith('change_me')
    || normalized.startsWith('change-me')
    || normalized.startsWith('changeme')
    || normalized.startsWith('placeholder')
    || normalized.includes('<')
    || normalized.includes('>');
}

function isRepeatedPattern(value: string): boolean {
  for (let patternLength = 1; patternLength <= value.length / 2; patternLength++) {
    if (value.length % patternLength !== 0) continue;
    const pattern = value.slice(0, patternLength);
    if (pattern.repeat(value.length / patternLength) === value) return true;
  }
  return false;
}

function isWeakSecret(value: string): boolean {
  return new Set(value).size < MIN_UNIQUE_SECRET_CHARACTERS || isRepeatedPattern(value);
}

export function validateProductionJwtSecrets(env: NodeJS.ProcessEnv): string[] {
  if (env.NODE_ENV !== 'production') return [];

  const errors: string[] = [];
  const jwtSecret = env.JWT_SECRET?.trim();
  const refreshSecret = env.REFRESH_TOKEN_SECRET?.trim();

  if (!jwtSecret) errors.push('JWT_SECRET is required in production');
  else if (isPlaceholder(jwtSecret)) errors.push('JWT_SECRET must not use a placeholder value in production');
  else if (jwtSecret.length < MIN_PRODUCTION_SECRET_LENGTH) errors.push(`JWT_SECRET must be at least ${MIN_PRODUCTION_SECRET_LENGTH} characters in production`);
  else if (isWeakSecret(jwtSecret)) errors.push('JWT_SECRET must use a high-entropy value in production');

  if (!refreshSecret) errors.push('REFRESH_TOKEN_SECRET is required in production');
  else if (isPlaceholder(refreshSecret)) errors.push('REFRESH_TOKEN_SECRET must not use a placeholder value in production');
  else if (refreshSecret.length < MIN_PRODUCTION_SECRET_LENGTH) errors.push(`REFRESH_TOKEN_SECRET must be at least ${MIN_PRODUCTION_SECRET_LENGTH} characters in production`);
  else if (isWeakSecret(refreshSecret)) errors.push('REFRESH_TOKEN_SECRET must use a high-entropy value in production');

  if (jwtSecret && refreshSecret && jwtSecret === refreshSecret) {
    errors.push('JWT_SECRET and REFRESH_TOKEN_SECRET must be different in production');
  }

  return errors;
}
