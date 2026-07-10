'use client';

import { useRef, useEffect, useCallback, KeyboardEvent, useMemo, memo } from 'react';
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

const VIRTUAL_THRESHOLD = 5000;
const VIRTUAL_LINE_BUFFER = 150;

function EditorAreaInner({ content, onChange, onCursorChange, onListeningChange, cursorInsertPos, onCursorInsertDone, fontSize = 14, textareaRef: externalRef, bookmarks }: EditorAreaProps) {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalRef || internalRef;
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const activeHighlightRef = useRef<HTMLDivElement>(null);
  const cursorPosRef = useRef(0);
  const cursorLineRef = useRef(1);
  const initialScrollDone = useRef(false);
  const pendingRafRef = useRef(0);
  const pendingSaveRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Virtual windowing for large documents
  const isVirtualRef = useRef(false);
  const preContentRef = useRef('');
  const postContentRef = useRef('');
  const virtualStartLineRef = useRef(0);
  const virtualTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const savedScrollRef = useRef(0);
  const isComposingRef = useRef(false);
  const lastInputTimeRef = useRef(0);

  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    start: startListening,
    stop: stopListening,
  } = useSpeechRecognition();

  useEffect(() => {
    onListeningChange?.(isListening);
  }, [isListening, onListeningChange]);

  const prevTranscriptRef = useRef('');
  useEffect(() => {
    if (transcript && transcript !== prevTranscriptRef.current) {
      prevTranscriptRef.current = transcript;
      const ta = textareaRef.current;
      if (!ta) return;
      const pos = cursorPosRef.current;
      const before = ta.value.substring(0, pos);
      const after = ta.value.substring(pos);
      const newVal = before + transcript + after;
      ta.value = newVal;
      ta.selectionStart = ta.selectionEnd = pos + transcript.length;
      cursorPosRef.current = pos + transcript.length;
      onChange(newVal);
    }
  }, [transcript, onChange]);

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

  const lineCount = useMemo(() => content.split('\n').length, [content]);
  const lineHeight = fontSize * 1.6;

  const highlightActiveLine = useCallback((line: number) => {
    const el = activeHighlightRef.current;
    if (el) {
      el.style.top = `${(line - 1) * lineHeight}px`;
    }
  }, [lineHeight]);

  const computeCursor = useCallback((ta: HTMLTextAreaElement) => {
    const pos = ta.selectionStart;
    cursorPosRef.current = pos;
    const val = ta.value;
    let line = 1;
    let lastNl = -1;
    for (let i = 0; i < pos; i++) {
      if (val.charCodeAt(i) === 10) { line++; lastNl = i; }
    }
    const col = pos - lastNl;
    // In virtual mode, adjust line number by the offset
    const displayLine = isVirtualRef.current ? line + virtualStartLineRef.current : line;
    cursorLineRef.current = displayLine;
    highlightActiveLine(displayLine);
    onCursorChange(displayLine, col);
  }, [onCursorChange, highlightActiveLine]);

  const syncScroll = useCallback(() => {
    if (isVirtualRef.current) return;
    if (lineNumbersRef.current && textareaRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // --- Virtual windowing ---
  const enterVirtualMode = useCallback((ta: HTMLTextAreaElement) => {
    if (isVirtualRef.current) return;
    const val = ta.value;
    const pos = ta.selectionStart;
    const selEnd = ta.selectionEnd;

    // Find cursor line
    let curLine = 1;
    for (let i = 0; i < pos; i++) {
      if (val.charCodeAt(i) === 10) curLine++;
    }

    // Calculate line boundaries for the window
    const lines = val.split('\n');
    const startLine = Math.max(0, curLine - VIRTUAL_LINE_BUFFER - 1);
    const endLine = Math.min(lines.length, curLine + VIRTUAL_LINE_BUFFER);

    const preLines = lines.slice(0, startLine);
    const windowLines = lines.slice(startLine, endLine);
    const postLines = lines.slice(endLine);

    preContentRef.current = preLines.length > 0 ? preLines.join('\n') + '\n' : '';
    postContentRef.current = postLines.length > 0 ? '\n' + postLines.join('\n') : '';
    virtualStartLineRef.current = startLine;
    savedScrollRef.current = ta.scrollTop;
    isVirtualRef.current = true;

    const windowText = windowLines.join('\n');
    const preLen = preContentRef.current.length;
    ta.value = windowText;
    ta.selectionStart = Math.max(0, pos - preLen);
    ta.selectionEnd = Math.max(0, selEnd - preLen);

    // Adjust scroll to maintain visual position
    ta.scrollTop = Math.max(0, savedScrollRef.current - startLine * lineHeight);
  }, [lineHeight]);

  const exitVirtualMode = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta || !isVirtualRef.current) return;
    if (isComposingRef.current) return;

    const pos = ta.selectionStart;
    const selEnd = ta.selectionEnd;
    const windowContent = ta.value;
    const preLen = preContentRef.current.length;
    const startLine = virtualStartLineRef.current;

    const fullContent = preContentRef.current + windowContent + postContentRef.current;

    isVirtualRef.current = false;
    ta.value = fullContent;
    ta.selectionStart = preLen + pos;
    ta.selectionEnd = preLen + selEnd;
    cursorPosRef.current = preLen + pos;

    // Restore scroll
    ta.scrollTop = ta.scrollTop + startLine * lineHeight;
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = ta.scrollTop;
    }

    preContentRef.current = '';
    postContentRef.current = '';
    virtualStartLineRef.current = 0;

    onChange(fullContent);
    requestAnimationFrame(() => computeCursor(ta));
  }, [lineHeight, onChange, computeCursor]);

  const resetVirtualTimer = useCallback(() => {
    clearTimeout(virtualTimerRef.current);
    virtualTimerRef.current = setTimeout(function tryExit() {
      if (isComposingRef.current) {
        virtualTimerRef.current = setTimeout(tryExit, 500);
        return;
      }
      exitVirtualMode();
    }, 1200);
  }, [exitVirtualMode]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = textareaRef.current;
    if (!ta) return;

    if (e.nativeEvent.isComposing) return;

    // Enter virtual mode for large docs on printable key
    if (!isVirtualRef.current && ta.value.length > VIRTUAL_THRESHOLD && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      enterVirtualMode(ta);
      resetVirtualTimer();
      // Don't return — let the key be processed on the now-small textarea
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '  ');
      if (!isVirtualRef.current) onChange(ta.value);
      return;
    }

  }, [onChange, enterVirtualMode, resetVirtualTimer]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (isVirtualRef.current) return;
    if (isComposingRef.current) return;
    if (Date.now() - lastInputTimeRef.current < 2000) return;
    if (ta.value !== content) {
      const savedStart = ta.selectionStart;
      const savedEnd = ta.selectionEnd;
      ta.value = content;
      ta.selectionStart = Math.min(savedStart, content.length);
      ta.selectionEnd = Math.min(savedEnd, content.length);
      cursorPosRef.current = Math.min(savedStart, content.length);
    }
  }, [content]);

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
        computeCursor(ta);
      });
    }
  }, [content, computeCursor]);

  useEffect(() => {
    if (cursorInsertPos != null && textareaRef.current) {
      const ta = textareaRef.current;
      ta.focus();
      ta.selectionStart = ta.selectionEnd = cursorInsertPos;
      cursorPosRef.current = cursorInsertPos;
      ta.blur();
      ta.focus();
      computeCursor(ta);
      onCursorInsertDone?.();
    }
  }, [cursorInsertPos, onCursorInsertDone, computeCursor]);

  const lineNumberText = useMemo(() => {
    const lines: string[] = [];
    for (let i = 1; i <= Math.max(lineCount, 1); i++) {
      lines.push(bookmarks?.has(i) ? '●' : String(i));
    }
    return lines.join('\n');
  }, [lineCount, bookmarks]);

  useEffect(() => {
    highlightActiveLine(cursorLineRef.current);
  }, [lineNumberText, highlightActiveLine]);

  const handleInput = useCallback(() => {
    lastInputTimeRef.current = Date.now();

    if (isVirtualRef.current) {
      resetVirtualTimer();
      const ta = textareaRef.current;
      if (ta) {
        cancelAnimationFrame(pendingRafRef.current);
        pendingRafRef.current = requestAnimationFrame(() => computeCursor(ta));
      }
      return;
    }

    const ta = textareaRef.current;
    if (!ta) return;
    cancelAnimationFrame(pendingRafRef.current);
    pendingRafRef.current = requestAnimationFrame(() => {
      computeCursor(ta);
    });
    clearTimeout(pendingSaveRef.current);
    pendingSaveRef.current = setTimeout(() => {
      onChange(ta.value);
    }, 300);
  }, [onChange, computeCursor, resetVirtualTimer]);

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false;
  }, []);

  // Flush unsaved content when page goes to background (PWA reliability)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const ta = textareaRef.current;
        if (!ta) return;
        // Cancel pending debounce and save immediately
        clearTimeout(pendingSaveRef.current);
        if (isVirtualRef.current) {
          // Exit virtual mode to reconstruct full content
          isComposingRef.current = false;
          exitVirtualMode();
        } else {
          onChange(ta.value);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [onChange, exitVirtualMode]);

  const handleFocus = useCallback(() => {
    if (isVirtualRef.current) exitVirtualMode();
  }, [exitVirtualMode]);

  const handleClick = useCallback(() => {
    const ta = textareaRef.current;
    if (ta) computeCursor(ta);
  }, [computeCursor]);

  return (
    <div className="editor-wrapper">
      <div className="line-numbers" ref={lineNumbersRef} style={{ fontSize, lineHeight: 1.6 }}>
        <div
          ref={activeHighlightRef}
          className="line-highlight"
          style={{ height: lineHeight }}
        />
        <pre className="line-num-pre">{lineNumberText}</pre>
      </div>
      <textarea
        ref={textareaRef}
        className="editor-textarea"
        defaultValue={content}
        onInput={handleInput}
        onScroll={syncScroll}
        onFocus={handleFocus}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
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

export default memo(EditorAreaInner);
