'use client';

import { useRef, useEffect, useCallback, useState, KeyboardEvent, useMemo } from 'react';
import { useSpeechRecognition } from '@/lib/useSpeechRecognition';

interface EditorAreaProps {
  content: string;
  onChange: (content: string) => void;
  onCursorChange: (line: number, col: number) => void;
  onListeningChange?: (listening: boolean) => void;
  cursorInsertPos?: number | null;
  onCursorInsertDone?: () => void;
  fontSize?: number;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  bookmarks?: Set<number>;
}


export default function EditorArea({ content, onChange, onCursorChange, onListeningChange, cursorInsertPos, onCursorInsertDone, fontSize = 14, textareaRef: externalRef, bookmarks }: EditorAreaProps) {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalRef || internalRef;
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [cursorLine, setCursorLine] = useState(1);
  const cursorPosRef = useRef(0);
  const initialScrollDone = useRef(false);

  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    start: startListening,
    stop: stopListening,
  } = useSpeechRecognition();

  // Notify parent about listening state
  useEffect(() => {
    onListeningChange?.(isListening);
  }, [isListening, onListeningChange]);

  // Insert finalized transcript at cursor position
  const prevTranscriptRef = useRef('');
  useEffect(() => {
    if (transcript && transcript !== prevTranscriptRef.current) {
      prevTranscriptRef.current = transcript;
      const ta = textareaRef.current;
      if (!ta) return;
      const pos = cursorPosRef.current;
      const before = content.substring(0, pos);
      const after = content.substring(pos);
      const newContent = before + transcript + after;
      onChange(newContent);
      requestAnimationFrame(() => {
        if (ta) {
          ta.selectionStart = ta.selectionEnd = pos + transcript.length;
          cursorPosRef.current = pos + transcript.length;
        }
      });
    }
  }, [transcript, content, onChange]);

  const handleMicClick = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      prevTranscriptRef.current = '';
      if (textareaRef.current) {
        cursorPosRef.current = textareaRef.current.selectionStart;
      }
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // IME変換中フラグ — 変換中にcontent syncがta.valueを上書きすると
  // 変換の1文字目だけ英字でコミットされるバグを防ぐ
  const isComposingRef = useRef(false);

  const lineCount = useMemo(() => content.split('\n').length, [content]);
  const lineHeight = fontSize * 1.6;

  const updateCursor = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const text = ta.value;
    const pos = ta.selectionStart;
    cursorPosRef.current = pos;
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

  // Tab key: insert 2 spaces (preserves undo history via execCommand)
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = textareaRef.current;
    if (!ta || e.key !== 'Tab') return;
    e.preventDefault();
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (!document.execCommand('insertText', false, '  ')) {
      // Fallback for browsers where execCommand is unavailable
      const val = ta.value;
      const newVal = val.substring(0, start) + '  ' + val.substring(end);
      ta.value = newVal;
      ta.selectionStart = ta.selectionEnd = start + 2;
      onChange(newVal);
    }
  }, [onChange]);

  const updateCursorRaf = useRef<number>(0);

  // Sync textarea DOM value only when content changes externally
  // (e.g. header insert, voice input, doc switch via `key` prop).
  // By using an uncontrolled textarea we prevent React's reconciler from
  // ever resetting the cursor or clearing the browser's undo stack.
  // IMPORTANT: skip entirely during IME composition — setting ta.value mid-
  // composition commits the first roman letter (e.g. "b") as English text.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (isComposingRef.current) return; // don't interrupt IME
    if (ta.value !== content) {
      const savedStart = ta.selectionStart;
      const savedEnd   = ta.selectionEnd;
      ta.value = content;
      ta.selectionStart = Math.min(savedStart, content.length);
      ta.selectionEnd   = Math.min(savedEnd,   content.length);
      cursorPosRef.current = Math.min(savedStart, content.length);
    }
    if (document.activeElement === ta) {
      cancelAnimationFrame(updateCursorRaf.current);
      updateCursorRaf.current = requestAnimationFrame(updateCursor);
    }
  }, [content, updateCursor]);

  // Scroll to bottom on initial mount
  useEffect(() => {
    if (!initialScrollDone.current && textareaRef.current && content) {
      initialScrollDone.current = true;
      const ta = textareaRef.current;
      requestAnimationFrame(() => {
        ta.scrollTop = ta.scrollHeight;
        if (lineNumbersRef.current) {
          lineNumbersRef.current.scrollTop = ta.scrollTop;
        }
        ta.selectionStart = ta.selectionEnd = ta.value.length;
        cursorPosRef.current = ta.value.length;
        updateCursor();
      });
    }
  }, [content, updateCursor]);

  // Handle cursor positioning from parent
  useEffect(() => {
    if (cursorInsertPos != null && textareaRef.current) {
      const ta = textareaRef.current;
      ta.focus();
      const pos = cursorInsertPos;
      ta.selectionStart = ta.selectionEnd = pos;
      cursorPosRef.current = pos;
      ta.blur();
      ta.focus();
      updateCursor();
      onCursorInsertDone?.();
    }
  }, [cursorInsertPos, onCursorInsertDone, updateCursor]);

  const lineNumbers = useMemo(() => {
    const nums = [];
    for (let i = 1; i <= Math.max(lineCount, 1); i++) {
      const hasBookmark = bookmarks?.has(i);
      nums.push(
        <span
          key={i}
          className={`line-num${i === cursorLine ? ' active' : ''}${hasBookmark ? ' bookmarked' : ''}`}
          style={{ height: lineHeight }}
        >
          {hasBookmark ? '●' : i}
        </span>
      );
    }
    return nums;
  }, [lineCount, cursorLine, bookmarks, lineHeight]);

  return (
    <div className="editor-wrapper">
      <div className="line-numbers" ref={lineNumbersRef} style={{ fontSize, lineHeight: 1.6 }}>
        {lineNumbers}
      </div>
      <textarea
        ref={textareaRef}
        className="editor-textarea"
        defaultValue={content}
        onChange={(e) => onChange(e.target.value)}
        onCompositionStart={() => { isComposingRef.current = true; }}
        onCompositionEnd={() => { isComposingRef.current = false; }}
        onScroll={syncScroll}
        onClick={updateCursor}
        onKeyUp={updateCursor}
        onKeyDown={handleKeyDown}
        onSelect={updateCursor}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        wrap="off"
        placeholder="Start typing..."
        style={{ fontSize, lineHeight: 1.6 }}
      />

      {isListening && interimTranscript && (
        <div className="voice-preview">{interimTranscript}</div>
      )}

      {isSupported && (
        <button
          className={`mic-btn${isListening ? ' listening' : ''}`}
          onClick={handleMicClick}
          title={isListening ? 'Stop voice input' : 'Start voice input'}
        >
          {isListening ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
