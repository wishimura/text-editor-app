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
          <span className="app-icon">🍋</span>
          <span className="app-title">Citrus Editor</span>
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
