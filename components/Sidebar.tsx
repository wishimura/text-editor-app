'use client';

import { useState, useCallback, useEffect, memo } from 'react';
import { Document, getFileIcon } from '@/lib/types';

interface SidebarProps {
  documents: Document[];
  trash: Document[];
  activeDocId: string | null;
  collapsed: boolean;
  onOpenDocument: (id: string) => void;
  onCreateDocument: () => void;
  onDeleteDocument: (id: string) => void;
  onRestoreDocument: (id: string) => void;
  onPermanentlyDelete: (id: string) => void;
  onEmptyTrash: () => void;
  onRenameDocument?: (id: string, name: string) => void;
  onMoveToFolder?: (id: string, folder: string) => void;
}

function SidebarInner({
  documents,
  trash,
  activeDocId,
  collapsed,
  onOpenDocument,
  onCreateDocument,
  onDeleteDocument,
  onRestoreDocument,
  onPermanentlyDelete,
  onEmptyTrash,
  onRenameDocument,
  onMoveToFolder,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [contextMenuDoc, setContextMenuDoc] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [trashOpen, setTrashOpen] = useState(false);

  const [knownFolders, setKnownFolders] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('citrus_folders') || '[]');
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('citrus_folders', JSON.stringify(knownFolders));
  }, [knownFolders]);

  useEffect(() => {
    if (!contextMenuDoc) return;
    const close = () => setContextMenuDoc(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenuDoc]);

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

  const handleCreateFolder = useCallback(() => {
    const name = prompt('フォルダ名:');
    if (!name?.trim()) return;
    const folderName = name.trim();
    setKnownFolders(prev => prev.includes(folderName) ? prev : [...prev, folderName]);
  }, []);

  const handleMoveToFolder = useCallback((docId: string, folder: string) => {
    if (onMoveToFolder) {
      onMoveToFolder(docId, folder);
      if (folder && !knownFolders.includes(folder)) {
        setKnownFolders(prev => [...prev, folder]);
      }
    }
    setContextMenuDoc(null);
  }, [onMoveToFolder, knownFolders]);

  const handleDeleteFolder = useCallback((folder: string) => {
    if (!confirm(`フォルダ「${folder}」を削除しますか？（中のファイルはルートに移動します）`)) return;
    documents.filter(d => d.folder === folder).forEach(doc => {
      if (onMoveToFolder) onMoveToFolder(doc.id, '');
    });
    setKnownFolders(prev => prev.filter(f => f !== folder));
  }, [documents, onMoveToFolder]);

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

  knownFolders.forEach(f => {
    if (!folders.has(f)) folders.set(f, []);
  });

  const allFolderNames = Array.from(folders.keys());

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
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenuDoc(doc.id);
          setContextMenuPos({ x: e.clientX, y: e.clientY });
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
          <button className="icon-btn" onClick={handleCreateFolder} title="New Folder">
            📁
          </button>
          <button className="icon-btn" onClick={onCreateDocument} title="New File">
            +
          </button>
        </div>
      </div>
      <div className="file-tree">
        {Array.from(folders.entries()).map(([folder, docs]) => {
          const isCollapsed = collapsedFolders.has(folder);
          return (
            <div key={folder} className="folder-group">
              <div className="folder-header" onClick={() => toggleFolder(folder)}>
                <span className="folder-arrow">{isCollapsed ? '▸' : '▾'}</span>
                <span className="folder-icon">📁</span>
                <span className="folder-name">{folder}</span>
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFolder(folder);
                  }}
                  title="Delete Folder"
                >
                  ×
                </button>
              </div>
              {!isCollapsed && docs.map(renderDoc)}
            </div>
          );
        })}
        {rootDocs.map(renderDoc)}
        {documents.length === 0 && (
          <div style={{ padding: '8px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
            No documents yet
          </div>
        )}
      </div>

      {/* Trash section */}
      <div className="trash-section">
        <div className="trash-header" onClick={() => setTrashOpen(prev => !prev)}>
          <span className="folder-arrow">{trashOpen ? '▾' : '▸'}</span>
          <span className="trash-icon">🗑</span>
          <span className="trash-title">ゴミ箱{trash.length > 0 ? ` (${trash.length})` : ''}</span>
          {trash.length > 0 && trashOpen && (
            <button
              className="delete-btn trash-empty-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('ゴミ箱を空にしますか？この操作は元に戻せません。')) {
                  onEmptyTrash();
                }
              }}
              title="ゴミ箱を空にする"
            >
              空にする
            </button>
          )}
        </div>
        {trashOpen && (
          <div className="trash-list">
            {trash.length === 0 && (
              <div style={{ padding: '8px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                ゴミ箱は空です
              </div>
            )}
            {trash.map(doc => {
              const icon = getFileIcon(doc.language);
              const deletedDate = doc.deleted_at
                ? new Date(doc.deleted_at).toLocaleDateString('ja-JP')
                : '';
              return (
                <div key={doc.id} className="tree-item trash-item">
                  <span className={`icon ${icon.cls}`} style={{ opacity: 0.5 }}>{icon.icon}</span>
                  <span className="name trash-name">{doc.title}</span>
                  <span className="trash-date">{deletedDate}</span>
                  <button
                    className="trash-action-btn restore-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestoreDocument(doc.id);
                    }}
                    title="復元"
                  >
                    ↩
                  </button>
                  <button
                    className="trash-action-btn perm-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`「${doc.title}」を完全に削除しますか？`)) {
                        onPermanentlyDelete(doc.id);
                      }
                    }}
                    title="完全に削除"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {contextMenuDoc && (
        <div
          className="context-menu"
          style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-header">フォルダへ移動</div>
          <button
            className="context-menu-item"
            onClick={() => handleMoveToFolder(contextMenuDoc, '')}
          >
            📄 ルート（フォルダなし）
          </button>
          {allFolderNames.map(f => (
            <button
              key={f}
              className="context-menu-item"
              onClick={() => handleMoveToFolder(contextMenuDoc, f)}
            >
              📁 {f}
            </button>
          ))}
          <div className="context-menu-divider" />
          <button
            className="context-menu-item"
            onClick={() => {
              const name = prompt('新しいフォルダ名:');
              if (name?.trim()) {
                handleMoveToFolder(contextMenuDoc, name.trim());
              }
            }}
          >
            ＋ 新規フォルダに移動
          </button>
        </div>
      )}
    </aside>
  );
}

export default memo(SidebarInner);
