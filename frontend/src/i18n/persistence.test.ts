// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'obo-language';

async function loadI18n() {
  vi.resetModules();
  const mod = await import('./index');
  return mod.default ?? mod;
}

async function waitForLang(i18n: any, lang: string) {
  if ((i18n.resolvedLanguage || i18n.language) === lang) return;
  await new Promise<void>((resolve) => {
    const handler = (lng: string) => {
      if (lng === lang || (i18n.resolvedLanguage || i18n.language) === lang) {
        i18n.off('languageChanged', handler);
        resolve();
      }
    };
    i18n.on('languageChanged', handler);
    setTimeout(() => {
      i18n.off('languageChanged', handler);
      resolve();
    }, 50);
  });
}

describe('legacy i18n persistence and document direction (Phase 12G)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = '';
    document.documentElement.dir = '';
  });

  afterEach(() => {
    localStorage.clear();
  });

  it.each([
    ['en', 'ltr'],
    ['hi', 'ltr'],
    ['mr', 'ltr'],
    ['bn', 'ltr'],
    ['ar', 'rtl'],
    ['ur', 'rtl'],
  ] as const)('restores valid saved locale %s with explicit lang/dir and persists it', async (locale, dir) => {
    localStorage.setItem(STORAGE_KEY, locale);
    const i18n = await loadI18n();
    await waitForLang(i18n, locale);
    expect(i18n.resolvedLanguage || i18n.language).toBe(locale);
    expect(document.documentElement.lang).toBe(locale);
    expect(document.documentElement.dir).toBe(dir);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(locale);
  });

  it.each([
    ['en', 'ltr'],
    ['hi', 'ltr'],
    ['mr', 'ltr'],
    ['bn', 'ltr'],
    ['ar', 'rtl'],
    ['ur', 'rtl'],
  ] as const)('language change updates metadata and persists obo-language for %s', async (locale, dir) => {
    const i18n = await loadI18n();
    await i18n.changeLanguage(locale);
    await waitForLang(i18n, locale);
    expect(document.documentElement.lang).toBe(locale);
    expect(document.documentElement.dir).toBe(dir);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(locale);
  });

  it.each([
    ['en', 'ltr'],
    ['hi', 'ltr'],
    ['mr', 'ltr'],
    ['bn', 'ltr'],
    ['ar', 'rtl'],
    ['ur', 'rtl'],
  ] as const)('reload/reinitialization restores saved locale %s', async (locale, dir) => {
    const i18n = await loadI18n();
    await i18n.changeLanguage(locale);
    await waitForLang(i18n, locale);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(locale);

    // simulate reload/reinitialization
    const i18n2 = await loadI18n();
    await waitForLang(i18n2, locale);
    expect(i18n2.resolvedLanguage || i18n2.language).toBe(locale);
    expect(document.documentElement.lang).toBe(locale);
    expect(document.documentElement.dir).toBe(dir);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(locale);
  });

  it.each(['es', 'fr', 'zh-CN', 'pt', 'de', 'ja', 'ko', 'ru', 'gu', 'kn', 'ml', 'pa', 'ta', 'te', 'or', 'as', 'xx', 'en-US', 'EN', '', '   '])(
    'invalid/unsupported/coming-soon-equivalent saved locale "%s" safely falls back to en',
    async (value) => {
      if (value === 'EN' || value === 'en-US') {
        // normalized base may map to en; treat as safe supported resolution
      }
      localStorage.setItem(STORAGE_KEY, value as string);
      const i18n = await loadI18n();
      await waitForLang(i18n, 'en');
      expect(i18n.resolvedLanguage || i18n.language).toBe('en');
      expect(document.documentElement.lang).toBe('en');
      expect(document.documentElement.dir).toBe('ltr');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('en');
    }
  );

  it('missing localStorage value safely initializes to en with explicit ltr', async () => {
    localStorage.removeItem(STORAGE_KEY);
    const i18n = await loadI18n();
    await waitForLang(i18n, 'en');
    expect(i18n.resolvedLanguage || i18n.language).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('en');
  });

  it('localStorage access failure does not crash initialization', async () => {
    const original = globalThis.localStorage;
    const throwingStorage = {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
      removeItem: () => { throw new Error('denied'); },
      clear: () => { throw new Error('denied'); },
      key: () => null,
      length: 0,
    } as unknown as Storage;
    Object.defineProperty(globalThis, 'localStorage', { value: throwingStorage, configurable: true });
    try {
      const i18n = await loadI18n();
      await waitForLang(i18n, 'en');
      expect(i18n.resolvedLanguage || i18n.language).toBe('en');
      expect(document.documentElement.lang).toBe('en');
      expect(document.documentElement.dir).toBe('ltr');
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { value: original, configurable: true });
    }
  });

  it('does not overwrite a valid saved supported locale on invalid runtime language transition', async () => {
    localStorage.setItem(STORAGE_KEY, 'hi');
    const i18n = await loadI18n();
    await waitForLang(i18n, 'hi');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('hi');
    expect(document.documentElement.lang).toBe('hi');
    expect(document.documentElement.dir).toBe('ltr');

    // Trigger invalid/unsupported runtime transition through i18next API.
    await i18n.changeLanguage('xx');
    await waitForLang(i18n, 'hi');

    expect(i18n.resolvedLanguage || i18n.language).toBe('hi');
    expect(document.documentElement.lang).toBe('hi');
    expect(document.documentElement.dir).toBe('ltr');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('hi');
  });

  it('preserves configured but not fully supported runtime locale (es) and follows six-locale startup restoration policy', async () => {
    const i18n = await loadI18n();
    await i18n.changeLanguage('es');
    await waitForLang(i18n, 'es');

    // Actual legacy-compatible runtime behavior: configured locale may be selected/persisted.
    expect(i18n.resolvedLanguage || i18n.language).toBe('es');
    expect(document.documentElement.lang).toBe('es');
    expect(document.documentElement.dir).toBe('ltr');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('es');

    // Startup restoration policy: only the six fully supported locales are restored.
    const i18n2 = await loadI18n();
    await waitForLang(i18n2, 'en');
    expect(i18n2.resolvedLanguage || i18n2.language).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('en');
  });

  it('uses deterministic English fallback on startup when no valid saved locale exists (navigator does not override)', async () => {
    localStorage.removeItem(STORAGE_KEY);
    const originalNavigator = globalThis.navigator;
    try {
      Object.defineProperty(globalThis, 'navigator', {
        value: { ...originalNavigator, language: 'ar', languages: ['ar', 'ur'] },
        configurable: true,
      });
    } catch {
      // If navigator cannot be redefined in this environment, the deterministic fallback below is still asserted.
    }

    const i18n = await loadI18n();
    await waitForLang(i18n, 'en');
    expect(i18n.resolvedLanguage || i18n.language).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('en');

    try {
      Object.defineProperty(globalThis, 'navigator', { value: originalNavigator, configurable: true });
    } catch {
      // ignore restore issues in restrictive environments
    }
  });
});
