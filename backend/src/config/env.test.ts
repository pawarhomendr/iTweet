import { describe, expect, it } from 'vitest';
import { MIN_PRODUCTION_SECRET_LENGTH, validateProductionJwtSecrets } from './env';

const validEnv = {
  NODE_ENV: 'production',
  JWT_SECRET: 'Access-9f3a2c7d-Secret-41b8e6f0-Value-72ab',
  REFRESH_TOKEN_SECRET: 'Refresh-6d1e4a9b-Secret-83c7f2e5-Value-19cd',
};

describe('production JWT secret validation', () => {
  it('accepts strong distinct secrets', () => {
    expect(validateProductionJwtSecrets(validEnv)).toEqual([]);
  });

  it('allows development setup to use local values', () => {
    expect(validateProductionJwtSecrets({ NODE_ENV: 'development', JWT_SECRET: 'short', REFRESH_TOKEN_SECRET: 'short' })).toEqual([]);
  });

  it('rejects missing access and refresh secrets without echoing values', () => {
    const errors = validateProductionJwtSecrets({ NODE_ENV: 'production' });

    expect(errors).toEqual(expect.arrayContaining([
      'JWT_SECRET is required in production',
      'REFRESH_TOKEN_SECRET is required in production',
    ]));
  });

  it.each([
    ['JWT_SECRET', { JWT_SECRET: 'short', REFRESH_TOKEN_SECRET: validEnv.REFRESH_TOKEN_SECRET }],
    ['REFRESH_TOKEN_SECRET', { JWT_SECRET: validEnv.JWT_SECRET, REFRESH_TOKEN_SECRET: 'short' }],
  ])('rejects a %s shorter than the documented minimum', (_name, values) => {
    const errors = validateProductionJwtSecrets({ NODE_ENV: 'production', ...values });

    expect(errors.join(' ')).toContain(`at least ${MIN_PRODUCTION_SECRET_LENGTH} characters`);
  });

  it.each([
    'replace_with_64_char_random_hex_value',
    'your-refresh-secret-value',
    'password',
    '<generate-a-secret>',
  ])('rejects known placeholder value %s', (placeholder) => {
    const errors = validateProductionJwtSecrets({
      ...validEnv,
      NODE_ENV: 'production',
      JWT_SECRET: placeholder,
    });

    expect(errors).toContain('JWT_SECRET must not use a placeholder value in production');
  });

  it('rejects obvious low-entropy repeated secrets', () => {
    const errors = validateProductionJwtSecrets({
      ...validEnv,
      NODE_ENV: 'production',
      JWT_SECRET: 'a'.repeat(MIN_PRODUCTION_SECRET_LENGTH),
    });

    expect(errors).toContain('JWT_SECRET must use a high-entropy value in production');
  });

  it('rejects identical production secrets', () => {
    expect(validateProductionJwtSecrets({
      NODE_ENV: 'production',
      JWT_SECRET: validEnv.JWT_SECRET,
      REFRESH_TOKEN_SECRET: validEnv.JWT_SECRET,
    })).toContain('JWT_SECRET and REFRESH_TOKEN_SECRET must be different in production');
  });

  it('does not include configured secret values in validation errors', () => {
    const accessSecret = 'Access-Secret-That-Must-Not-Appear-In-Errors-123456';
    const errors = validateProductionJwtSecrets({
      NODE_ENV: 'production',
      JWT_SECRET: accessSecret,
      REFRESH_TOKEN_SECRET: accessSecret,
    });

    expect(errors.join(' ')).not.toContain(accessSecret);
  });
});
