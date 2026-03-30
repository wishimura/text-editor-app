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
          <svg className="app-logo" width="20" height="20" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 22 C20 22, 10 18, 6 6" stroke="#3a9b4a" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <path d="M20 22 C20 22, 14 12, 14 2" stroke="#3a9b4a" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <path d="M20 22 C20 22, 20 10, 20 0" stroke="#3a9b4a" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <path d="M20 22 C20 22, 26 12, 26 2" stroke="#3a9b4a" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <path d="M20 22 C20 22, 30 18, 34 6" stroke="#3a9b4a" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <ellipse cx="6" cy="4" rx="3.5" ry="5.5" fill="#3a9b4a" transform="rotate(-20, 6, 4)"/>
            <ellipse cx="14" cy="1" rx="3.5" ry="5.5" fill="#3a9b4a" transform="rotate(-8, 14, 1)"/>
            <ellipse cx="20" cy="0" rx="3.5" ry="5.5" fill="#3a9b4a"/>
            <ellipse cx="26" cy="1" rx="3.5" ry="5.5" fill="#3a9b4a" transform="rotate(8, 26, 1)"/>
            <ellipse cx="34" cy="4" rx="3.5" ry="5.5" fill="#3a9b4a" transform="rotate(20, 34, 4)"/>
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
