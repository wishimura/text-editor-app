'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useDocuments } from '@/lib/useDocuments';
import TitleBar from './TitleBar';
import Sidebar from './Sidebar';
import TabBar from './TabBar';
import EditorArea from './EditorArea';
import StatusBar from './StatusBar';
import CommandPalette from './CommandPalette';
import VoiceNewDoc from './VoiceNewDoc';
import AiPanel from './AiPanel';
import SearchBar from './SearchBar';
import MarkdownPreview from './MarkdownPreview';

export default function Editor() {
  const {
    documents,
    openTabs,
    activeDocId,
    activeDoc,
    isLoading,
    saveStatus,
    openDocument,
    closeTab,
    setActiveDocId,
    createDocument,
    deleteDocument,
    updateContent,
    flushSave,
    refetch,
    renameDocument,
    updateFolder,
  } = useDocuments();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth < 768;
    return false;
  });
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const cursorPosRef = useRef({ line: 1, col: 1 });
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const cursorRaf = useRef(0);
  const [isListening, setIsListening] = useState(false);
  const [voiceNewDocMode, setVoiceNewDocMode] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [mdPreviewOpen, setMdPreviewOpen] = useState(false);
  const [cursorInsertPos, setCursorInsertPos] = useState<number | null>(null);
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());

  // Theme
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('citrus_theme') || 'dark';
    return 'dark';
  });
  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('citrus_theme', next);
      return next;
    });
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Font size
  const [fontSize, setFontSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('citrus_fontSize');
      return saved ? parseInt(saved, 10) : 14;
    }
    return 14;
  });
  const changeFontSize = useCallback((delta: number) => {
    setFontSize(prev => {
      const next = Math.max(10, Math.min(28, prev + delta));
      localStorage.setItem('citrus_fontSize', String(next));
      return next;
    });
  }, []);

  // Textarea ref (passed to SearchBar)
  const editorTextareaRef = useRef<HTMLTextAreaElement>(null);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const handleCreateDocument = useCallback(() => {
    const name = prompt('File name:');
    if (name) createDocument(name);
  }, [createDocument]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const doc = await createDocument(file.name);
    if (doc) {
      updateContent(doc.id, text);
    }
    e.target.value = '';
  }, [createDocument, updateContent]);

  const handleDeleteDocument = useCallback((id: string) => {
    if (confirm('Delete this file?')) {
      deleteDocument(id);
    }
  }, [deleteDocument]);

  const handleCursorChange = useCallback((line: number, col: number) => {
    cursorPosRef.current = { line, col };
    cancelAnimationFrame(cursorRaf.current);
    cursorRaf.current = requestAnimationFrame(() => {
      setCursorPos({ line, col });
    });
  }, []);

  const charCountTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleContentChange = useCallback((content: string) => {
    if (activeDocId) {
      updateContent(activeDocId, content);
    }
    clearTimeout(charCountTimer.current);
    charCountTimer.current = setTimeout(() => setCharCount(content.length), 300);
  }, [activeDocId, updateContent]);

  const handleListeningChange = useCallback((listening: boolean) => {
    setIsListening(listening);
  }, []);

  const handleVoiceNewDoc = useCallback(() => {
    setVoiceNewDocMode(true);
  }, []);

  const handleInsertHeader = useCallback(() => {
    if (!activeDocId) return;
    const currentContent = editorTextareaRef.current?.value ?? '';
    const today = new Date();
    const dateStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
    const separator = '----------------------------------------';
    const beforeCursor = `\n\n${separator}\n${dateStr} `;
    const afterCursor = `\n${separator}\n`;
    const newContent = currentContent + beforeCursor + afterCursor;
    updateContent(activeDocId, newContent);
    setCursorInsertPos(currentContent.length + beforeCursor.length);
  }, [activeDocId, updateContent]);

  const handleDownload = useCallback(() => {
    if (!activeDoc) return;
    const currentContent = editorTextareaRef.current?.value ?? activeDoc.content;
    const blob = new Blob([currentContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeDoc.title;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeDoc]);

  const handleToggleBookmark = useCallback(() => {
    const line = cursorPosRef.current.line;
    setBookmarks(prev => {
      const next = new Set(prev);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });
  }, []);

  const handleNextBookmark = useCallback(() => {
    if (bookmarks.size === 0) return;
    const sorted = Array.from(bookmarks).sort((a, b) => a - b);
    const currentLine = cursorPosRef.current.line;
    const next = sorted.find(b => b > currentLine) || sorted[0];
    if (editorTextareaRef.current) {
      const lines = editorTextareaRef.current.value.split('\n');
      let pos = 0;
      for (let i = 0; i < Math.min(next - 1, lines.length); i++) {
        pos += lines[i].length + 1;
      }
      setCursorInsertPos(pos);
    }
  }, [bookmarks]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.shiftKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (mod && e.key === '\\') {
        e.preventDefault();
        setSidebarCollapsed(prev => !prev);
      }
      if (mod && e.key === 's') {
        e.preventDefault();
        flushSave();
      }
      // Fix: ⌘⇧L or ⌘⇧H - date header (both shortcuts, H=Header as fallback)
      if (mod && e.shiftKey && (e.key === 'l' || e.key === 'L' || e.code === 'KeyL' || e.key === 'h' || e.key === 'H' || e.code === 'KeyH')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleInsertHeader();
        return;
      }
      if (mod && e.key === '/') {
        e.preventDefault();
        setAiPanelOpen(prev => !prev);
      }
      if (mod && e.shiftKey && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        handleCreateDocument();
      }
      if (mod && e.key === 'o') {
        e.preventDefault();
        fileInputRef.current?.click();
      }
      // Search: Cmd+F
      if (mod && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
      // Font size: Cmd+= / Cmd+-
      if (mod && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        changeFontSize(1);
      }
      if (mod && e.key === '-') {
        e.preventDefault();
        changeFontSize(-1);
      }
      // Markdown preview: Cmd+Shift+M
      if (mod && e.shiftKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        setMdPreviewOpen(prev => !prev);
      }
      // Toggle bookmark: Cmd+Shift+B
      if (mod && e.shiftKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        handleToggleBookmark();
      }
      // Download: Cmd+Shift+S
      if (mod && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleDownload();
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
        setAiPanelOpen(false);
        setSearchOpen(false);
        setMdPreviewOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [activeDocId, closeTab, flushSave, handleCreateDocument, handleInsertHeader, changeFontSize, handleToggleBookmark, handleDownload]);

  const handleCloseActiveTab = useCallback(() => {
    if (activeDocId) closeTab(activeDocId);
  }, [activeDocId, closeTab]);

  const commands = [
    { name: 'New File', shortcut: '⌘ ⇧ E', action: handleCreateDocument },
    { name: 'Open File', shortcut: '⌘ O', action: handleOpenFile },
    { name: 'Download File', shortcut: '⌘ ⇧ S', action: handleDownload },
    { name: 'Close Tab', shortcut: '', action: handleCloseActiveTab },
    { name: 'Toggle Sidebar', shortcut: '⌘ \\', action: toggleSidebar },
    { name: 'Find & Replace', shortcut: '⌘ F', action: () => setSearchOpen(prev => !prev) },
    { name: 'Markdown Preview', shortcut: '⌘ ⇧ M', action: () => setMdPreviewOpen(prev => !prev) },
    { name: 'Insert Date Header', shortcut: '⌘ ⇧ H', action: handleInsertHeader },
    { name: 'Toggle Bookmark', shortcut: '⌘ ⇧ B', action: handleToggleBookmark },
    { name: 'Next Bookmark', shortcut: '', action: handleNextBookmark },
    { name: 'Font Size +', shortcut: '⌘ +', action: () => changeFontSize(1) },
    { name: 'Font Size -', shortcut: '⌘ -', action: () => changeFontSize(-1) },
    { name: 'Toggle Theme', shortcut: '', action: toggleTheme },
    { name: 'Save', shortcut: '⌘ S', action: flushSave },
    { name: 'Voice → New Document', shortcut: '', action: handleVoiceNewDoc },
    { name: 'AI Assistant', shortcut: '⌘ /', action: () => setAiPanelOpen(prev => !prev) },
    { name: 'Reload Documents', shortcut: '', action: refetch },
  ];

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        Loading...
      </div>
    );
  }

  const titleFileName = activeDoc
    ? activeDoc.title
    : 'Citrus Editor';

  return (
    <div className="app">
      <TitleBar fileName={titleFileName} onToggleSidebar={toggleSidebar} onReload={refetch} />

      {/* Mobile toolbar */}
      <div className="mobile-toolbar">
        <button className="mobile-toolbar-btn" onClick={toggleSidebar}>Files</button>
        <button className="mobile-toolbar-btn" onClick={handleInsertHeader}>+ Header</button>
        <button className="mobile-toolbar-btn" onClick={() => setAiPanelOpen(prev => !prev)}>AI</button>
        <button className="mobile-toolbar-btn" onClick={handleCreateDocument}>+ New</button>
        <button className="mobile-toolbar-btn" onClick={handleVoiceNewDoc}>Voice</button>
        <button className="mobile-toolbar-btn" onClick={flushSave}>Save</button>
      </div>

      <div className="main-container">
        {/* Sidebar overlay for mobile */}
        <div
          className={`sidebar-overlay${!sidebarCollapsed ? ' visible' : ''}`}
          onClick={() => setSidebarCollapsed(true)}
        />
        <Sidebar
          documents={documents}
          activeDocId={activeDocId}
          collapsed={sidebarCollapsed}
          onOpenDocument={openDocument}
          onCreateDocument={handleCreateDocument}
          onDeleteDocument={handleDeleteDocument}
          onRenameDocument={renameDocument}
          onMoveToFolder={updateFolder}
        />

        <div className="editor-area">
          <TabBar
            documents={documents}
            openTabs={openTabs}
            activeDocId={activeDocId}
            onActivateTab={(id) => setActiveDocId(id)}
            onCloseTab={closeTab}
          />

          {activeDoc ? (
            <>
              {/* Editor Toolbar */}
              <div className="editor-toolbar">
                <button className="toolbar-btn" onClick={() => setSearchOpen(prev => !prev)} title="検索・置換 (⌘F)">🔍</button>
                <button className="toolbar-btn" onClick={handleDownload} title="ダウンロード (⌘⇧S)">💾</button>
                <button className="toolbar-btn" onClick={() => setMdPreviewOpen(prev => !prev)} title="MDプレビュー (⌘⇧M)" disabled={activeDoc.language !== 'md'}>📖</button>
                <button className="toolbar-btn" onClick={handleToggleBookmark} title="ブックマーク (⌘⇧B)">🔖</button>
                <button className="toolbar-btn" onClick={handleNextBookmark} title="次のブックマーク" disabled={bookmarks.size === 0}>⏭</button>
                <button className="toolbar-btn" onClick={handleInsertHeader} title="日付ヘッダー (⌘⇧L)">📅</button>
                <div className="toolbar-separator" />
                <button className="toolbar-btn" onClick={() => changeFontSize(-1)} title="フォント縮小 (⌘-)">A-</button>
                <button className="toolbar-btn" onClick={() => changeFontSize(1)} title="フォント拡大 (⌘+)">A+</button>
                <div className="toolbar-separator" />
                <button className="toolbar-btn" onClick={() => setAiPanelOpen(prev => !prev)} title="AI Assistant (⌘/)">🤖</button>
              </div>

              <SearchBar
                visible={searchOpen}
                onClose={() => setSearchOpen(false)}
                content={activeDoc.content}
                onChange={handleContentChange}
                textareaRef={editorTextareaRef}
              />
              <div className="editor-split">
                <EditorArea
                  content={activeDoc.content}
                  onChange={handleContentChange}
                  onCursorChange={handleCursorChange}
                  onListeningChange={handleListeningChange}
                  cursorInsertPos={cursorInsertPos}
                  onCursorInsertDone={() => setCursorInsertPos(null)}
                  fontSize={fontSize}
                  textareaRef={editorTextareaRef}
                  bookmarks={bookmarks}
                />
                <MarkdownPreview
                  content={activeDoc.content}
                  visible={mdPreviewOpen && activeDoc.language === 'md'}
                  onClose={() => setMdPreviewOpen(false)}
                />
              </div>
            </>
          ) : (
            <div className="welcome-screen">
              <img className="logo-img" src="/citrusapp.png" alt="CitrusApp" height="80" />
              <h2 style={{ color: '#3a9b4a' }}>CitrusApp</h2>
              <div className="shortcuts">
                <div className="shortcut-row">
                  <kbd>⌘ ⇧ K</kbd>
                  <span>Command Palette</span>
                </div>
                <div className="shortcut-row">
                  <kbd>⌘ ⇧ H</kbd>
                  <span>Insert Date Header</span>
                </div>
                <div className="shortcut-row">
                  <kbd>⌘ /</kbd>
                  <span>AI Assistant</span>
                </div>
                <div className="shortcut-row">
                  <kbd>⌘ \</kbd>
                  <span>Toggle Sidebar</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AiPanel
        visible={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
      />

      <StatusBar
        line={cursorPos.line}
        col={cursorPos.col}
        language={activeDoc?.language || 'plaintext'}
        saveStatus={saveStatus}
        isListening={isListening}
        charCount={charCount}
        fontSize={fontSize}
        onToggleTheme={toggleTheme}
        theme={theme}
      />

      <CommandPalette
        visible={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        commands={commands}
      />

      {/* Hidden file input for Open File */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        accept=".txt,.md,.html,.css,.js,.jsx,.ts,.tsx,.json,.xml,.yaml,.yml,.csv,.log"
        onChange={handleFileSelected}
      />

      <VoiceNewDoc
        visible={voiceNewDocMode}
        onClose={() => setVoiceNewDocMode(false)}
        onComplete={async (text) => {
          const timestamp = new Date().toLocaleString('ja-JP');
          const doc = await createDocument(`voice-${Date.now()}.md`);
          if (doc) {
            updateContent(doc.id, `# Voice Note - ${timestamp}\n\n${text}\n`);
          }
        }}
      />
    </div>
  );
}
