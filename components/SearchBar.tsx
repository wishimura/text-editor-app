'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface SearchBarProps {
  visible: boolean;
  onClose: () => void;
  content: string;
  onChange: (content: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export default function SearchBar({ visible, onClose, content, onChange, textareaRef }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [replace, setReplace] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [matchIndex, setMatchIndex] = useState(0);
  const [matches, setMatches] = useState<number[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── highlightMatch を先に定義（後のuseEffectから参照するため） ──────────
  // focusTextarea=true  → textareaにフォーカスを移してブラウザにスクロールさせる（↑↓ボタン用）
  // focusTextarea=false → フォーカスを奪わずに scrollTop で直接スクロール（自動ハイライト用）
  const highlightMatch = useCallback((pos: number, focusTextarea = false) => {
    const ta = textareaRef.current;
    if (!ta || pos < 0) return;

    // 選択範囲をセット（フォーカス時に視覚的にハイライトされる）
    ta.selectionStart = pos;
    ta.selectionEnd = pos + query.length;

    if (focusTextarea) {
      // ↑↓ボタン押下時: textareaにフォーカスしてブラウザ標準のスクロールに任せる
      ta.focus();
    } else {
      // 検索ワード入力中: フォーカスを奪わずに scrollTop で確実にスクロール
      const linesBefore = ta.value.substring(0, pos).split('\n');
      const lineNum = linesBefore.length - 1; // 0-indexed
      const lineHeightPx = parseFloat(getComputedStyle(ta).lineHeight) || 22.4;
      // マッチ行を画面中央よりやや上に表示
      const target = Math.max(0, lineNum * lineHeightPx - ta.clientHeight / 3);
      ta.scrollTop = target;
    }
  }, [textareaRef, query]);

  // ── visible 変化: 開閉のリセット処理 ────────────────────────────────────
  useEffect(() => {
    if (visible) {
      setQuery('');
      setReplace('');
      setMatches([]);
      setMatchIndex(0);
      requestAnimationFrame(() => searchRef.current?.focus());
    } else {
      // 閉じるとき: stateリセット + textareaの選択範囲を解除してフォーカスを戻す
      setQuery('');
      setMatches([]);
      setMatchIndex(0);
      const ta = textareaRef.current;
      if (ta) {
        const pos = ta.selectionStart;
        ta.selectionEnd = pos; // 選択範囲を折りたたむ（カーソルを1点に）
        ta.focus();
      }
    }
  }, [visible, textareaRef]);

  // ── 検索マッチ計算 ────────────────────────────────────────────────────────
  useEffect(() => {
    // 非表示 or クエリ空のときは動かさない
    if (!visible || !query) {
      setMatches([]);
      setMatchIndex(0);
      return;
    }
    const found: number[] = [];
    const lower = content.toLowerCase();
    const q = query.toLowerCase();
    let idx = 0;
    while (true) {
      const pos = lower.indexOf(q, idx);
      if (pos === -1) break;
      found.push(pos);
      idx = pos + 1;
    }
    setMatches(found);
    setMatchIndex(0);
    if (found.length > 0) highlightMatch(found[0], false);
  }, [visible, query, content, highlightMatch]);

  // ── ナビゲーション ────────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    if (matches.length === 0) return;
    const next = (matchIndex + 1) % matches.length;
    setMatchIndex(next);
    highlightMatch(matches[next], true);
  }, [matches, matchIndex, highlightMatch]);

  const goPrev = useCallback(() => {
    if (matches.length === 0) return;
    const prev = (matchIndex - 1 + matches.length) % matches.length;
    setMatchIndex(prev);
    highlightMatch(matches[prev], true);
  }, [matches, matchIndex, highlightMatch]);

  // ── 置換 ──────────────────────────────────────────────────────────────────
  const handleReplace = useCallback(() => {
    if (matches.length === 0) return;
    const pos = matches[matchIndex];
    const newContent = content.substring(0, pos) + replace + content.substring(pos + query.length);
    onChange(newContent);
  }, [matches, matchIndex, content, query, replace, onChange]);

  const handleReplaceAll = useCallback(() => {
    if (!query) return;
    const newContent = content.split(query).join(replace);
    onChange(newContent);
  }, [content, query, replace, onChange]);

  // ── 閉じる ────────────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    setQuery('');
    setMatches([]);
    setMatchIndex(0);
    onClose();
  }, [onClose]);

  // ── キーボード操作 ────────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { handleClose(); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) goPrev();
      else goNext();
    }
  }, [handleClose, goNext, goPrev]);

  if (!visible) return null;

  return (
    <div className="search-bar">
      <div className="search-row">
        <input
          ref={searchRef}
          className="search-input"
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <span className="search-count">
          {matches.length > 0 ? `${matchIndex + 1}/${matches.length}` : 'No results'}
        </span>
        <button className="search-btn" onClick={goPrev} title="前へ (Shift+Enter)">↑</button>
        <button className="search-btn" onClick={goNext} title="次へ (Enter)">↓</button>
        <button className="search-btn" onClick={() => setShowReplace(!showReplace)} title="置換">
          {showReplace ? '−' : '⇄'}
        </button>
        <button className="search-btn" onClick={handleClose} title="閉じる (Esc)">×</button>
      </div>
      {showReplace && (
        <div className="search-row">
          <input
            className="search-input"
            type="text"
            placeholder="Replace..."
            value={replace}
            onChange={(e) => setReplace(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="search-btn" onClick={handleReplace} title="Replace">Replace</button>
          <button className="search-btn" onClick={handleReplaceAll} title="Replace All">All</button>
        </div>
      )}
    </div>
  );
}
