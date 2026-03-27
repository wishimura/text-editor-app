'use client';

import { Document, getFileIcon } from '@/lib/types';

interface TabBarProps {
  documents: Document[];
  openTabs: string[];
  activeDocId: string | null;
  onActivateTab: (id: string) => void;
  onCloseTab: (id: string) => void;
}

export default function TabBar({ documents, openTabs, activeDocId, onActivateTab, onCloseTab }: TabBarProps) {
  return (
    <div className="tab-bar">
      {openTabs.map(tabId => {
        const doc = documents.find(d => d.id === tabId);
        if (!doc) return null;
        const icon = getFileIcon(doc.language);
        const isActive = activeDocId === tabId;

        return (
          <div
            key={tabId}
            className={`tab${isActive ? ' active' : ''}`}
            onClick={() => onActivateTab(tabId)}
          >
            <span className={`tab-icon ${icon.cls}`}>{icon.icon}</span>
            <span className="tab-name">{doc.title}</span>
            <span className="tab-dot" />
            <span
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tabId);
              }}
            >
              ×
            </span>
          </div>
        );
      })}
    </div>
  );
}
