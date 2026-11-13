import path from 'node:path';
import dotenv from 'dotenv';

export interface EnvironmentFilePaths {
  /** Legacy location retained for compatibility with existing local setups. */
  legacyRoot: string;
  /** Canonical local-development location. */
  backend: string;
}

export interface EnvironmentFileLoadOptions {
  path: string;
  override: false;
}

export type EnvironmentFileLoader = (options: EnvironmentFileLoadOptions) => unknown;

export function resolveEnvironmentFilePaths(moduleDirectory: string): EnvironmentFilePaths {
  return {
    legacyRoot: path.resolve(moduleDirectory, '..', '..', '.env'),
    backend: path.resolve(moduleDirectory, '..', '.env'),
  };
}

/**
 * Load the legacy root file first to preserve its existing precedence. The
 * canonical backend file fills only unset values, and process.env always wins
 * because dotenv is called with override disabled.
 */
export function loadEnvironmentFiles(
  moduleDirectory: string,
  load: EnvironmentFileLoader = (options) => dotenv.config(options),
): void {
  const paths = resolveEnvironmentFilePaths(moduleDirectory);
  load({ path: paths.legacyRoot, override: false });
  load({ path: paths.backend, override: false });
}
