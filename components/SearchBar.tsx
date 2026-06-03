'use client';

import { useState, useCallback, useRef, useEffect, CompositionEvent } from 'react';

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
  const isComposingRef = useRef(false);
  // Full document content, updated from prop and after replace ops
  const fullContentRef = useRef(content);

  useEffect(() => {
    fullContentRef.current = content;
  }, [content]);

  // --- IME composition guards ---
  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleSearchCompositionEnd = useCallback((e: CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false;
    setQuery(e.currentTarget.value);
  }, []);

  const handleReplaceCompositionEnd = useCallback((e: CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false;
    setReplace(e.currentTarget.value);
  }, []);

  // --- Search logic (always uses full content, never windowed) ---
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

  // --- Reset on open/close (only when visibility changes) ---
  useEffect(() => {
    if (visible) {
      fullContentRef.current = textareaRef.current?.value ?? content;
      setQuery('');
      setReplace('');
      setMatches([]);
      setMatchIndex(0);
      requestAnimationFrame(() => searchRef.current?.focus());
    } else {
      setQuery('');
      setMatches([]);
      setMatchIndex(0);
      const ta = textareaRef.current;
      if (ta) {
        ta.selectionEnd = ta.selectionStart;
        ta.focus();
      }
    }
  }, [visible]);

  // --- Live search (no focus stealing) ---
  useEffect(() => {
    if (!visible || !query) {
      setMatches([]);
      setMatchIndex(0);
      return;
    }
    const found = findMatches(fullContentRef.current, query);
    setMatches(found);
    setMatchIndex(0);
    if (found.length > 0) scrollToPos(found[0]);
  }, [visible, query, findMatches, scrollToPos]);

  // --- Navigation: focus textarea and highlight match ---
  const navigateToMatch = useCallback((index: number) => {
    if (matches.length === 0) return;
    const pos = matches[index];
    const ta = textareaRef.current;
    if (!ta) return;
    // Focus exits virtual mode via EditorArea's handleFocus
    ta.focus();
    ta.selectionStart = pos;
    ta.selectionEnd = pos + query.length;
    scrollToPos(pos);
  }, [matches, textareaRef, query, scrollToPos]);

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

  // --- Replace: uses execCommand for undo support ---
  const handleReplace = useCallback(() => {
    if (matches.length === 0) return;
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = matches[matchIndex];
    // Focus textarea (exits virtual mode, restores full content)
    ta.focus();
    ta.selectionStart = pos;
    ta.selectionEnd = pos + query.length;
    document.execCommand('insertText', false, replace);
    const newContent = ta.value;
    fullContentRef.current = newContent;
    onChange(newContent);
    // Re-search with updated content
    const found = findMatches(newContent, query);
    setMatches(found);
    setMatchIndex(Math.min(matchIndex, Math.max(0, found.length - 1)));
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [matches, matchIndex, query, replace, onChange, findMatches, textareaRef]);

  const handleReplaceAll = useCallback(() => {
    if (!query) return;
    const ta = textareaRef.current;
    if (!ta) return;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    const newContent = fullContentRef.current.replace(regex, replace);
    // Focus textarea (exits virtual mode), replace all via execCommand
    ta.focus();
    ta.select();
    document.execCommand('insertText', false, newContent);
    fullContentRef.current = newContent;
    onChange(ta.value);
    setMatches([]);
    setMatchIndex(0);
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [query, replace, onChange, textareaRef]);

  // --- Close ---
  const handleClose = useCallback(() => {
    setQuery('');
    setMatches([]);
    setMatchIndex(0);
    onClose();
  }, [onClose]);

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
          onChange={(e) => { if (!isComposingRef.current) setQuery(e.target.value); }}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleSearchCompositionEnd}
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
            onChange={(e) => { if (!isComposingRef.current) setReplace(e.target.value); }}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleReplaceCompositionEnd}
          />
          <button className="search-btn" onClick={handleReplace} title="Replace">Replace</button>
          <button className="search-btn" onClick={handleReplaceAll} title="Replace All">All</button>
        </div>
      )}
    </div>
  );
}
