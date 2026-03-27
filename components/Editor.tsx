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

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [isListening, setIsListening] = useState(false);
  const [voiceNewDocMode, setVoiceNewDocMode] = useState(false);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (mod && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed(prev => !prev);
      }
      if (mod && e.shiftKey && e.key === 'n') {
        e.preventDefault();
        handleCreateDocument();
      }
      if (mod && e.shiftKey && e.key === 'w') {
        e.preventDefault();
        if (activeDocId) closeTab(activeDocId);
      }
      if (mod && e.key === 's') {
        e.preventDefault();
        flushSave();
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDocId, closeTab, flushSave, handleCreateDocument]);

  const commands = [
    { name: 'New File', shortcut: '⌘ ⇧ N', action: handleCreateDocument },
    { name: 'Toggle Sidebar', shortcut: '⌘ B', action: toggleSidebar },
    { name: 'Close Tab', shortcut: '⌘ ⇧ W', action: () => activeDocId && closeTab(activeDocId) },
    { name: 'Save', shortcut: '⌘ S', action: flushSave },
    { name: 'Voice → New Document', shortcut: '', action: handleVoiceNewDoc },
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

      <div className="main-container">
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
            />
          ) : (
            <div className="welcome-screen">
              <div className="logo">⚛</div>
              <h2>Atom Editor</h2>
              <div className="shortcuts">
                <div className="shortcut-row">
                  <kbd>⌘ ⇧ N</kbd>
                  <span>New File</span>
                </div>
                <div className="shortcut-row">
                  <kbd>⌘ ⇧ P</kbd>
                  <span>Command Palette</span>
                </div>
                <div className="shortcut-row">
                  <kbd>⌘ B</kbd>
                  <span>Toggle Sidebar</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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
