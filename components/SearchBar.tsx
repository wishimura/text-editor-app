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

  useEffect(() => {
    if (visible) {
      setQuery('');
      setReplace('');
      setMatches([]);
      setMatchIndex(0);
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [visible]);

  useEffect(() => {
    if (!query) {
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
    if (found.length > 0) highlightMatch(found[0]);
  }, [query, content]);

  const highlightMatch = useCallback((pos: number) => {
    const ta = textareaRef.current;
    if (!ta || pos < 0) return;
    ta.focus();
    ta.selectionStart = pos;
    ta.selectionEnd = pos + query.length;
    // Scroll to selection
    const lines = content.substring(0, pos).split('\n');
    const lineHeight = 22.4;
    ta.scrollTop = Math.max(0, (lines.length - 5) * lineHeight);
  }, [textareaRef, query, content]);

  const goNext = useCallback(() => {
    if (matches.length === 0) return;
    const next = (matchIndex + 1) % matches.length;
    setMatchIndex(next);
    highlightMatch(matches[next]);
  }, [matches, matchIndex, highlightMatch]);

  const goPrev = useCallback(() => {
    if (matches.length === 0) return;
    const prev = (matchIndex - 1 + matches.length) % matches.length;
    setMatchIndex(prev);
    highlightMatch(matches[prev]);
  }, [matches, matchIndex, highlightMatch]);

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

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) goPrev();
      else goNext();
    }
  }, [onClose, goNext, goPrev]);

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
        <button className="search-btn" onClick={goPrev} title="Previous">↑</button>
        <button className="search-btn" onClick={goNext} title="Next">↓</button>
        <button className="search-btn" onClick={() => setShowReplace(!showReplace)} title="Toggle Replace">
          {showReplace ? '−' : '⇄'}
        </button>
        <button className="search-btn" onClick={onClose} title="Close">×</button>
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
