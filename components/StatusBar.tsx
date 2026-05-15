'use client';

import { memo, useEffect, useRef } from 'react';
import { langMap } from '@/lib/types';
import { SaveStatus } from '@/lib/useDocuments';

interface StatusBarProps {
  language: string;
  saveStatus: SaveStatus;
  isListening?: boolean;
  fontSize?: number;
  onToggleTheme?: () => void;
  theme?: string;
}

const saveLabels: Record<SaveStatus, string> = {
  idle: '',
  saving: 'Saving...',
  saved: 'Saved',
  error: 'Save failed',
};

function StatusBarInner({ language, saveStatus, isListening, fontSize, onToggleTheme, theme }: StatusBarProps) {
  const saveRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (saveRef.current) {
      saveRef.current.textContent = saveLabels[saveStatus];
      saveRef.current.style.display = saveStatus === 'idle' ? 'none' : '';
    }
  }, [saveStatus]);

  return (
    <div className="status-bar">
      <div className="status-left">
        {isListening && (
          <span className="status-item status-recording">
            <span className="recording-dot" />
            Recording...
          </span>
        )}
        <span ref={saveRef} className="status-item save-status" style={{ display: saveStatus === 'idle' ? 'none' : undefined }}>
          {saveLabels[saveStatus]}
        </span>
        <span id="status-charcount" className="status-item">0 chars</span>
      </div>
      <div className="status-right">
        <span id="status-cursor" className="status-item">Ln 1, Col 1</span>
        {fontSize && (
          <span className="status-item">{fontSize}px</span>
        )}
        <span className="status-item">Spaces: 2</span>
        <span className="status-item">UTF-8</span>
        <span className="status-item">{langMap[language] || 'Plain Text'}</span>
        {onToggleTheme && (
          <span className="status-item status-clickable theme-toggle" onClick={onToggleTheme} title={theme === 'light' ? 'Dark mode' : 'Light mode'}>
            {theme === 'light' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

export default memo(StatusBarInner);
