'use client';

import { useRef, useEffect, useCallback, useState, KeyboardEvent, useMemo } from 'react';

interface EditorAreaProps {
  content: string;
  onChange: (content: string) => void;
  onCursorChange: (line: number, col: number) => void;
}

const bracketPairs: Record<string, string> = {
  '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`',
};

export default function EditorArea({ content, onChange, onCursorChange }: EditorAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [cursorLine, setCursorLine] = useState(1);

  const lineCount = useMemo(() => content.split('\n').length, [content]);

  const updateCursor = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const text = ta.value;
    const pos = ta.selectionStart;
    const lines = text.substring(0, pos).split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    setCursorLine(line);
    onCursorChange(line, col);
  }, [onCursorChange]);

  const syncScroll = useCallback(() => {
    if (lineNumbersRef.current && textareaRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = textareaRef.current;
    if (!ta) return;

    // Tab key
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = ta.value;
      const newVal = val.substring(0, start) + '  ' + val.substring(end);
      ta.value = newVal;
      ta.selectionStart = ta.selectionEnd = start + 2;
      onChange(newVal);
      return;
    }

    // Auto-close brackets
    if (bracketPairs[e.key]) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = ta.value;

      if (start !== end) {
        e.preventDefault();
        const selected = val.substring(start, end);
        const wrapped = e.key + selected + bracketPairs[e.key];
        const newVal = val.substring(0, start) + wrapped + val.substring(end);
        ta.value = newVal;
        ta.selectionStart = start + 1;
        ta.selectionEnd = end + 1;
        onChange(newVal);
      } else {
        e.preventDefault();
        const newVal = val.substring(0, start) + e.key + bracketPairs[e.key] + val.substring(end);
        ta.value = newVal;
        ta.selectionStart = ta.selectionEnd = start + 1;
        onChange(newVal);
      }
    }
  }, [onChange]);

  useEffect(() => {
    updateCursor();
  }, [content, updateCursor]);

  // Line numbers
  const lineNumbers = useMemo(() => {
    const nums = [];
    for (let i = 1; i <= Math.max(lineCount, 1); i++) {
      nums.push(
        <span key={i} className={`line-num${i === cursorLine ? ' active' : ''}`}>
          {i}
        </span>
      );
    }
    return nums;
  }, [lineCount, cursorLine]);

  return (
    <div className="editor-wrapper">
      <div className="line-numbers" ref={lineNumbersRef}>
        {lineNumbers}
      </div>
      <textarea
        ref={textareaRef}
        className="editor-textarea"
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        onClick={updateCursor}
        onKeyUp={updateCursor}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        wrap="off"
        placeholder="Start typing..."
      />
    </div>
  );
}
