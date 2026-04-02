'use client';

import { useMemo } from 'react';

interface MarkdownPreviewProps {
  content: string;
  visible: boolean;
  onClose: () => void;
}

function renderMarkdown(md: string): string {
  let html = md
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="md-code-block"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')
    // Headers
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold & italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Strikethrough
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    // Checkboxes
    .replace(/^- \[x\] (.+)$/gm, '<div class="md-check done">☑ $1</div>')
    .replace(/^- \[ \] (.+)$/gm, '<div class="md-check">☐ $1</div>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Blockquote
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Horizontal rule
    .replace(/^---+$/gm, '<hr/>')
    .replace(/^-{10,}$/gm, '<hr/>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')
    // Line breaks (double newline = paragraph)
    .replace(/\n\n/g, '</p><p>')
    // Single newlines
    .replace(/\n/g, '<br/>');

  return `<p>${html}</p>`;
}

export default function MarkdownPreview({ content, visible, onClose }: MarkdownPreviewProps) {
  const html = useMemo(() => renderMarkdown(content), [content]);

  if (!visible) return null;

  return (
    <div className="md-preview-panel">
      <div className="md-preview-header">
        <span className="md-preview-title">Markdown Preview</span>
        <button className="md-preview-close" onClick={onClose}>×</button>
      </div>
      <div
        className="md-preview-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
