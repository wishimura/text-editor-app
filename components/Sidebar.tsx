'use client';

import { useState, useCallback } from 'react';
import { Document, getFileIcon } from '@/lib/types';

interface SidebarProps {
  documents: Document[];
  activeDocId: string | null;
  collapsed: boolean;
  onOpenDocument: (id: string) => void;
  onCreateDocument: () => void;
  onDeleteDocument: (id: string) => void;
  onRenameDocument?: (id: string, name: string) => void;
  onMoveToFolder?: (id: string, folder: string) => void;
}

export default function Sidebar({
  documents,
  activeDocId,
  collapsed,
  onOpenDocument,
  onCreateDocument,
  onDeleteDocument,
  onRenameDocument,
  onMoveToFolder,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  const startRename = useCallback((id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  }, []);

  const finishRename = useCallback(() => {
    if (editingId && editName.trim() && onRenameDocument) {
      onRenameDocument(editingId, editName.trim());
    }
    setEditingId(null);
  }, [editingId, editName, onRenameDocument]);

  const toggleFolder = useCallback((folder: string) => {
    setCollapsedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folder)) next.delete(folder);
      else next.add(folder);
      return next;
    });
  }, []);

  // Group docs by folder
  const folders = new Map<string, Document[]>();
  const rootDocs: Document[] = [];
  documents.forEach(doc => {
    const folder = doc.folder || '';
    if (folder) {
      if (!folders.has(folder)) folders.set(folder, []);
      folders.get(folder)!.push(doc);
    } else {
      rootDocs.push(doc);
    }
  });

  const renderDoc = (doc: Document) => {
    const icon = getFileIcon(doc.language);
    const isEditing = editingId === doc.id;

    return (
      <div
        key={doc.id}
        className={`tree-item${activeDocId === doc.id ? ' active' : ''}`}
        onClick={() => !isEditing && onOpenDocument(doc.id)}
        onDoubleClick={(e) => {
          e.stopPropagation();
          startRename(doc.id, doc.title);
        }}
      >
        <span className={`icon ${icon.cls}`}>{icon.icon}</span>
        {isEditing ? (
          <input
            className="rename-input"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={finishRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') finishRename();
              if (e.key === 'Escape') setEditingId(null);
            }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="name">{doc.title}</span>
        )}
        <button
          className="delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteDocument(doc.id);
          }}
          title="Delete"
        >
          ×
        </button>
      </div>
    );
  };

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-header">
        <span className="sidebar-title">DOCUMENTS</span>
        <div className="sidebar-actions">
          <button className="icon-btn" onClick={onCreateDocument} title="New File">
            +
          </button>
        </div>
      </div>
      <div className="file-tree">
        {/* Folders */}
        {Array.from(folders.entries()).map(([folder, docs]) => {
          const isCollapsed = collapsedFolders.has(folder);
          return (
            <div key={folder} className="folder-group">
              <div className="folder-header" onClick={() => toggleFolder(folder)}>
                <span className="folder-arrow">{isCollapsed ? '▸' : '▾'}</span>
                <span className="folder-icon">📁</span>
                <span className="folder-name">{folder}</span>
              </div>
              {!isCollapsed && docs.map(renderDoc)}
            </div>
          );
        })}
        {/* Root documents */}
        {rootDocs.map(renderDoc)}
        {documents.length === 0 && (
          <div style={{ padding: '8px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
            No documents yet
          </div>
        )}
      </div>
    </aside>
  );
}
