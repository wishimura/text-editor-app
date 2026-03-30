'use client';

import { useState } from 'react';

interface TitleBarProps {
  fileName: string;
  onToggleSidebar: () => void;
}

const SHORTCUTS = [
  { key: '⌘ ⇧ K', desc: 'コマンドパレット' },
  { key: '⌘ \\', desc: 'サイドバー開閉' },
  { key: '⌘ S', desc: '保存' },
  { key: '⌘ ⇧ L', desc: '日付ヘッダー挿入' },
  { key: '⌘ /', desc: 'AIアシスタント開閉' },
  { key: 'Escape', desc: 'パネルを閉じる' },
  { key: 'Enter', desc: 'AI: メッセージ送信' },
  { key: '⇧ Enter', desc: 'AI: 改行' },
];

export default function TitleBar({ fileName, onToggleSidebar }: TitleBarProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);

  return (
    <>
      <div className="title-bar">
        <div className="title-bar-left">
          <svg className="app-logo" width="18" height="18" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Citrus cross-section fan shape */}
            <path d="M18 32 Q2 28, 2 12 A16 16 0 0 1 34 12 Q34 28, 18 32Z" fill="#3a9b4a"/>
            {/* Segment divider lines */}
            <path d="M18 32 Q10 24, 5 14" stroke="#1a1a2e" strokeWidth="1.8" fill="none"/>
            <path d="M18 32 Q14 22, 11 10" stroke="#1a1a2e" strokeWidth="1.8" fill="none"/>
            <path d="M18 32 L18 8" stroke="#1a1a2e" strokeWidth="1.8" fill="none"/>
            <path d="M18 32 Q22 22, 25 10" stroke="#1a1a2e" strokeWidth="1.8" fill="none"/>
            <path d="M18 32 Q26 24, 31 14" stroke="#1a1a2e" strokeWidth="1.8" fill="none"/>
          </svg>
          <span className="app-title" style={{ color: '#3a9b4a', fontWeight: 700 }}>CitrusApp</span>
        </div>
        <div className="title-bar-center">{fileName}</div>
        <div className="title-bar-right">
          <button
            className="title-btn"
            onClick={() => setShowShortcuts(true)}
            title="Keyboard Shortcuts"
          >
            ?
          </button>
          <button className="title-btn" onClick={onToggleSidebar} title="Toggle Sidebar">
            ☰
          </button>
        </div>
      </div>

      {showShortcuts && (
        <div className="shortcuts-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="shortcuts-modal" onClick={e => e.stopPropagation()}>
            <div className="shortcuts-modal-header">
              <span>Keyboard Shortcuts</span>
              <button className="shortcuts-close" onClick={() => setShowShortcuts(false)}>×</button>
            </div>
            <div className="shortcuts-list">
              {SHORTCUTS.map(({ key, desc }) => (
                <div key={key} className="shortcuts-row">
                  <kbd className="shortcuts-kbd">{key}</kbd>
                  <span className="shortcuts-desc">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
