import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadEnvironmentFiles, resolveEnvironmentFilePaths } from './envFiles';

describe('environment file resolution', () => {
  const moduleDirectory = path.resolve('workspace', 'backend', 'src');

  it('resolves the canonical backend file and legacy root fallback independently of cwd', () => {
    expect(resolveEnvironmentFilePaths(moduleDirectory)).toEqual({
      legacyRoot: path.resolve(moduleDirectory, '..', '..', '.env'),
      backend: path.resolve(moduleDirectory, '..', '.env'),
    });
  });

  it('preserves legacy root precedence while allowing the backend file to fill gaps', () => {
    const loaded: Array<{ path: string; override: false }> = [];

    loadEnvironmentFiles(moduleDirectory, (options) => {
      loaded.push(options);
    });

    const paths = resolveEnvironmentFilePaths(moduleDirectory);
    expect(loaded).toEqual([
      { path: paths.legacyRoot, override: false },
      { path: paths.backend, override: false },
    ]);
  });
});
