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
  const [showReplace, setShowReplace] = useState(false);
  const [matchIndex, setMatchIndex] = useState(0);
  const [matches, setMatches] = useState<number[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const fullContentRef = useRef(content);

  useEffect(() => {
    fullContentRef.current = content;
  }, [content]);

  const findMatches = useCallback((text: string, q: string): number[] => {
    if (!q) return [];
    const found: number[] = [];
    const lower = text.toLowerCase();
    const ql = q.toLowerCase();
    let idx = 0;
    while (true) {
      const pos = lower.indexOf(ql, idx);
      if (pos === -1) break;
      found.push(pos);
      idx = pos + 1;
    }
    return found;
  }, []);

  const scrollToPos = useCallback((pos: number) => {
    const ta = textareaRef.current;
    if (!ta || pos < 0) return;
    const textBefore = fullContentRef.current.substring(0, pos);
    const lineNum = textBefore.split('\n').length - 1;
    const lineHeightPx = parseFloat(getComputedStyle(ta).lineHeight) || 22.4;
    ta.scrollTop = Math.max(0, lineNum * lineHeightPx - ta.clientHeight / 3);
  }, [textareaRef]);

  // Reset on open/close
  useEffect(() => {
    if (visible) {
      fullContentRef.current = textareaRef.current?.value ?? content;
      if (searchRef.current) searchRef.current.value = '';
      if (replaceRef.current) replaceRef.current.value = '';
      setMatches([]);
      setMatchIndex(0);
      setShowReplace(false);
      requestAnimationFrame(() => searchRef.current?.focus());
    } else {
      const ta = textareaRef.current;
      if (ta) {
        ta.selectionEnd = ta.selectionStart;
        ta.focus();
      }
    }
  }, [visible]);

  const doSearch = useCallback(() => {
    const q = searchRef.current?.value ?? '';
    if (!q) {
      setMatches([]);
      setMatchIndex(0);
      return;
    }
    const found = findMatches(fullContentRef.current, q);
    setMatches(found);
    setMatchIndex(0);
    if (found.length > 0) scrollToPos(found[0]);
  }, [findMatches, scrollToPos]);

  const navigateToMatch = useCallback((index: number, currentMatches?: number[]) => {
    const m = currentMatches ?? matches;
    if (m.length === 0) return;
    const pos = m[index];
    const q = searchRef.current?.value ?? '';
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    ta.selectionStart = pos;
    ta.selectionEnd = pos + q.length;
    scrollToPos(pos);
  }, [matches, textareaRef, scrollToPos]);

  const goNext = useCallback(() => {
    if (matches.length === 0) return;
    const next = (matchIndex + 1) % matches.length;
    setMatchIndex(next);
    navigateToMatch(next);
  }, [matches, matchIndex, navigateToMatch]);

  const goPrev = useCallback(() => {
    if (matches.length === 0) return;
    const prev = (matchIndex - 1 + matches.length) % matches.length;
    setMatchIndex(prev);
    navigateToMatch(prev);
  }, [matches, matchIndex, navigateToMatch]);

  const handleReplace = useCallback(() => {
    if (matches.length === 0) return;
    const ta = textareaRef.current;
    if (!ta) return;
    const q = searchRef.current?.value ?? '';
    const r = replaceRef.current?.value ?? '';
    const pos = matches[matchIndex];
    ta.focus();
    ta.selectionStart = pos;
    ta.selectionEnd = pos + q.length;
    document.execCommand('insertText', false, r);
    const newContent = ta.value;
    fullContentRef.current = newContent;
    onChange(newContent);
    const found = findMatches(newContent, q);
    setMatches(found);
    const newIndex = Math.min(matchIndex, Math.max(0, found.length - 1));
    setMatchIndex(newIndex);
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [matches, matchIndex, onChange, findMatches, textareaRef]);

  const handleReplaceAll = useCallback(() => {
    const q = searchRef.current?.value ?? '';
    if (!q) return;
    const ta = textareaRef.current;
    if (!ta) return;
    const r = replaceRef.current?.value ?? '';
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    const newContent = fullContentRef.current.replace(regex, r);
    ta.focus();
    ta.select();
    document.execCommand('insertText', false, newContent);
    fullContentRef.current = newContent;
    onChange(ta.value);
    setMatches([]);
    setMatchIndex(0);
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [onChange, textareaRef]);

  const handleClose = useCallback(() => {
    setMatches([]);
    setMatchIndex(0);
    onClose();
  }, [onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { handleClose(); return; }
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
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
          defaultValue=""
          onInput={doSearch}
          onKeyDown={handleKeyDown}
          autoFocus
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
            ref={replaceRef}
            className="search-input"
            type="text"
            placeholder="Replace..."
            defaultValue=""
            onKeyDown={handleKeyDown}
          />
          <button className="search-btn" onClick={handleReplace} title="Replace">Replace</button>
          <button className="search-btn" onClick={handleReplaceAll} title="Replace All">All</button>
        </div>
      )}
    </div>
  );
}
