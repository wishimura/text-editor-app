'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDocuments } from '@/lib/useDocuments';
import TitleBar from './TitleBar';
import Sidebar from './Sidebar';
import TabBar from './TabBar';
import EditorArea from './EditorArea';
import StatusBar from './StatusBar';
import CommandPalette from './CommandPalette';
import VoiceNewDoc from './VoiceNewDoc';
import AiPanel from './AiPanel';

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
  } = useDocuments();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth < 768;
    return false;
  });
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [isListening, setIsListening] = useState(false);
  const [voiceNewDocMode, setVoiceNewDocMode] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const handleCreateDocument = useCallback(() => {
    const name = prompt('File name:');
    if (name) createDocument(name);
  }, [createDocument]);

  const handleDeleteDocument = useCallback((id: string) => {
    if (confirm('Delete this file?')) {
      deleteDocument(id);
    }
  }, [deleteDocument]);

  const handleCursorChange = useCallback((line: number, col: number) => {
    setCursorPos({ line, col });
  }, []);

  const handleContentChange = useCallback((content: string) => {
    if (activeDocId) {
      updateContent(activeDocId, content);
    }
  }, [activeDocId, updateContent]);

  const handleListeningChange = useCallback((listening: boolean) => {
    setIsListening(listening);
  }, []);

  const handleVoiceNewDoc = useCallback(() => {
    setVoiceNewDocMode(true);
  }, []);

  const handleInsertHeader = useCallback(() => {
    if (!activeDocId || !activeDoc) return;
    const today = new Date();
    const dateStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
    const separator = '----------------------------------------';
    // Build header: separator, date + space (cursor goes here), separator
    const beforeCursor = `\n\n${separator}\n${dateStr} `;
    const afterCursor = `\n${separator}\n`;
    const newContent = activeDoc.content + beforeCursor + afterCursor;
    updateContent(activeDocId, newContent);
    // Cursor right after "YYYY/MM/DD " (title input position)
    setCursorInsertPos(activeDoc.content.length + beforeCursor.length);
  }, [activeDocId, activeDoc, updateContent]);

  const [cursorInsertPos, setCursorInsertPos] = useState<number | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // All shortcuts chosen to avoid Chrome conflicts
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
      if (mod && e.shiftKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        handleInsertHeader();
      }
      if (mod && e.key === '/') {
        e.preventDefault();
        setAiPanelOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
        setAiPanelOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDocId, closeTab, flushSave, handleCreateDocument, handleInsertHeader]);

  const handleCloseActiveTab = useCallback(() => {
    if (activeDocId) closeTab(activeDocId);
  }, [activeDocId, closeTab]);

  const commands = [
    { name: 'New File', shortcut: '', action: handleCreateDocument },
    { name: 'Close Tab', shortcut: '', action: handleCloseActiveTab },
    { name: 'Toggle Sidebar', shortcut: '⌘ \\', action: toggleSidebar },
    { name: 'Insert Date Header', shortcut: '⌘ ⇧ L', action: handleInsertHeader },
    { name: 'Save', shortcut: '⌘ S', action: flushSave },
    { name: 'Voice → New Document', shortcut: '', action: handleVoiceNewDoc },
    { name: 'AI Assistant', shortcut: '⌘ /', action: () => setAiPanelOpen(prev => !prev) },
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
    : 'Atom Editor';

  return (
    <div className="app">
      <TitleBar fileName={titleFileName} onToggleSidebar={toggleSidebar} />

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
            <EditorArea
              content={activeDoc.content}
              onChange={handleContentChange}
              onCursorChange={handleCursorChange}
              onListeningChange={handleListeningChange}
              cursorInsertPos={cursorInsertPos}
              onCursorInsertDone={() => setCursorInsertPos(null)}
            />
          ) : (
            <div className="welcome-screen">
              <div className="logo">⚛</div>
              <h2>Atom Editor</h2>
              <div className="shortcuts">
                <div className="shortcut-row">
                  <kbd>⌘ ⇧ K</kbd>
                  <span>Command Palette</span>
                </div>
                <div className="shortcut-row">
                  <kbd>⌘ ⇧ L</kbd>
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
      />

      <CommandPalette
        visible={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        commands={commands}
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
