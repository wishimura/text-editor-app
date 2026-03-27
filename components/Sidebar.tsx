'use client';

import { Document, getFileIcon } from '@/lib/types';

interface SidebarProps {
  documents: Document[];
  activeDocId: string | null;
  collapsed: boolean;
  onOpenDocument: (id: string) => void;
  onCreateDocument: () => void;
  onDeleteDocument: (id: string) => void;
}

export default function Sidebar({
  documents,
  activeDocId,
  collapsed,
  onOpenDocument,
  onCreateDocument,
  onDeleteDocument,
}: SidebarProps) {
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
        {documents.map(doc => {
          const icon = getFileIcon(doc.language);
          return (
            <div
              key={doc.id}
              className={`tree-item${activeDocId === doc.id ? ' active' : ''}`}
              onClick={() => onOpenDocument(doc.id)}
            >
              <span className={`icon ${icon.cls}`}>{icon.icon}</span>
              <span className="name">{doc.title}</span>
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
        })}
        {documents.length === 0 && (
          <div style={{ padding: '8px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
            No documents yet
          </div>
        )}
      </div>
    </aside>
  );
}
