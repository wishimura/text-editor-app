'use client';

import { langMap } from '@/lib/types';
import { SaveStatus } from '@/lib/useDocuments';

interface StatusBarProps {
  line: number;
  col: number;
  language: string;
  saveStatus: SaveStatus;
  isListening?: boolean;
  charCount?: number;
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

export default function StatusBar({ line, col, language, saveStatus, isListening, charCount, fontSize, onToggleTheme, theme }: StatusBarProps) {
  return (
    <div className="status-bar">
      <div className="status-left">
        {isListening && (
          <span className="status-item status-recording">
            <span className="recording-dot" />
            Recording...
          </span>
        )}
        {saveStatus !== 'idle' && (
          <span className="status-item save-status">{saveLabels[saveStatus]}</span>
        )}
        {charCount !== undefined && (
          <span className="status-item">{charCount.toLocaleString()} chars</span>
        )}
      </div>
      <div className="status-right">
        <span className="status-item">Ln {line}, Col {col}</span>
        {fontSize && (
          <span className="status-item">{fontSize}px</span>
        )}
        <span className="status-item">Spaces: 2</span>
        <span className="status-item">UTF-8</span>
        <span className="status-item">{langMap[language] || 'Plain Text'}</span>
        {onToggleTheme && (
          <span className="status-item status-clickable" onClick={onToggleTheme}>
            {theme === 'light' ? '🌙' : '☀️'}
          </span>
        )}
      </div>
    </div>
  );
}
