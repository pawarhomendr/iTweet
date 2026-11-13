import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GlobeIcon } from '@/components/ui/Icons';
import { SUPPORTED_LANGUAGES } from '@/i18n';

/**
 * File: C:\iTweet\frontend\src\components\common\LanguageSelector.tsx
 * Callers: C:\iTweet\frontend\src\components\layout\Header.tsx and SettingsPage.tsx
 * Purpose: Polished language selector supporting all 23 initial locales with search and native names.
 * Instruction: "Create a polished language selector integrated into the existing Header and Settings. Display native language names. Search languages by name."
 */

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) || SUPPORTED_LANGUAGES[0];

  const filtered = SUPPORTED_LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(search.toLowerCase())
  );

  const changeLanguage = (code: string, dir: string) => {
    i18n.changeLanguage(code);
    document.documentElement.dir = dir;
    document.documentElement.lang = code;
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-sm btn-ghost"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontFamily: 'var(--mono)',
          fontSize: '12px',
        }}
        aria-expanded={isOpen}
        aria-label="Select language"
      >
        <GlobeIcon />
        <span>{currentLang.nativeName}</span>
        <span style={{ opacity: 0.6 }}>▼</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '240px',
            background: 'var(--surface)',
            border: '1.5px solid var(--rule)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 200,
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '360px',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '10px', borderBottom: '1px solid var(--rule)' }}>
            <input
              type="text"
              placeholder="Search 23 languages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '12.5px',
                borderRadius: '4px',
                border: '1px solid var(--rule)',
                background: 'var(--paper)',
                color: 'var(--ink)',
                outline: 'none',
              }}
              autoFocus
            />
          </div>

          <div style={{ overflowY: 'auto', padding: '4px' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--muted)' }}>
                No language found
              </div>
            ) : (
              filtered.map((l) => (
                <button
                  type="button"
                  key={l.code}
                  onClick={() => changeLanguage(l.code, l.dir)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: i18n.language === l.code ? 'var(--accent-soft)' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: i18n.language === l.code ? 'var(--accent)' : 'var(--ink)',
                    fontWeight: i18n.language === l.code ? 600 : 400,
                    fontSize: '13px',
                  }}
                >
                  <span>{l.nativeName}</span>
                  <span className="mono dim" style={{ fontSize: '11px' }}>{l.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
