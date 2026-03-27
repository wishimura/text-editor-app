'use client';

import { langMap } from '@/lib/types';
import { SaveStatus } from '@/lib/useDocuments';

interface StatusBarProps {
  line: number;
  col: number;
  language: string;
  saveStatus: SaveStatus;
  isListening?: boolean;
}

const saveLabels: Record<SaveStatus, string> = {
  idle: '',
  saving: 'Saving...',
  saved: 'Saved',
  error: 'Save failed',
};

export default function StatusBar({ line, col, language, saveStatus, isListening }: StatusBarProps) {
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
      </div>
      <div className="status-right">
        <span className="status-item">Ln {line}, Col {col}</span>
        <span className="status-item">Spaces: 2</span>
        <span className="status-item">UTF-8</span>
        <span className="status-item">{langMap[language] || 'Plain Text'}</span>
      </div>
    </div>
  );
}
