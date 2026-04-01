'use client';

import { useState } from 'react';

interface TitleBarProps {
  fileName: string;
  onToggleSidebar: () => void;
  onReload?: () => void;
}

const SHORTCUTS = [
  { key: '⌘ ⇧ E', desc: '新規ファイル' },
  { key: '⌘ O', desc: 'ファイルを開く' },
  { key: '⌘ ⇧ K', desc: 'コマンドパレット' },
  { key: '⌘ \\', desc: 'サイドバー開閉' },
  { key: '⌘ S', desc: '保存' },
  { key: '⌘ ⇧ L', desc: '日付ヘッダー挿入' },
  { key: '⌘ /', desc: 'AIアシスタント開閉' },
  { key: 'Escape', desc: 'パネルを閉じる' },
  { key: 'Enter', desc: 'AI: メッセージ送信' },
  { key: '⇧ Enter', desc: 'AI: 改行' },
];

export default function TitleBar({ fileName, onToggleSidebar, onReload }: TitleBarProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);

  return (
    <>
      <div className="title-bar">
        <div className="title-bar-left">
          <img className="app-logo" src="/citrusapp.png" alt="CitrusApp" height="20" />
        </div>
        <div className="title-bar-center">{fileName}</div>
        <div className="title-bar-right">
          {onReload && (
            <button className="title-btn" onClick={onReload} title="Reload Documents">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </button>
          )}
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
