'use client';

import { useMemo, useState } from 'react';

interface MarkdownPreviewProps {
  content: string;
  visible: boolean;
  onClose: () => void;
}

function parseTable(block: string): string {
  const lines = block.trim().split('\n');
  if (lines.length < 2) return block;

  const parseRow = (line: string) =>
    line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());

  const headers = parseRow(lines[0]);
  const alignLine = parseRow(lines[1]);

  const aligns = alignLine.map(c => {
    if (/^:-+:$/.test(c)) return 'center';
    if (/^-+:$/.test(c)) return 'right';
    return 'left';
  });

  let html = '<table class="md-table"><thead><tr>';
  headers.forEach((h, i) => {
    html += `<th style="text-align:${aligns[i] || 'left'}">${h}</th>`;
  });
  html += '</tr></thead><tbody>';

  for (let r = 2; r < lines.length; r++) {
    const cells = parseRow(lines[r]);
    html += '<tr>';
    cells.forEach((c, i) => {
      html += `<td style="text-align:${aligns[i] || 'left'}">${c}</td>`;
    });
    html += '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

function renderMarkdown(md: string): string {
  // Extract code blocks first to protect them
  const codeBlocks: string[] = [];
  let processed = md.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    codeBlocks.push(`<pre class="md-code-block"><code>${code}</code></pre>`);
    return `\x00CODE${codeBlocks.length - 1}\x00`;
  });

  // Parse tables before other block-level transforms
  processed = processed.replace(
    /(?:^|\n)((?:\|.+\|[ \t]*\n)\|[-:| ]+\|[ \t]*\n(?:\|.+\|[ \t]*(?:\n|$))+)/g,
    (_, table) => '\n' + parseTable(table) + '\n'
  );

  let html = processed
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

  // Restore code blocks
  html = html.replace(/\x00CODE(\d+)\x00/g, (_, i) => codeBlocks[parseInt(i)]);

  return `<p>${html}</p>`;
}

export default function MarkdownPreview({ content, visible, onClose }: MarkdownPreviewProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const html = useMemo(() => renderMarkdown(content), [content]);

  if (!visible) return null;

  return (
    <div className={`md-preview-panel${fullscreen ? ' fullscreen' : ''}`}>
      <div className="md-preview-header">
        <span className="md-preview-title">Markdown Preview</span>
        <div className="md-preview-actions">
          <button
            className="md-preview-action-btn"
            onClick={() => setFullscreen(prev => !prev)}
            title={fullscreen ? '分割表示に戻す' : '全画面表示'}
          >
            {fullscreen ? '⊡' : '⊞'}
          </button>
          <button className="md-preview-close" onClick={() => { setFullscreen(false); onClose(); }}>×</button>
        </div>
      </div>
      <div
        className="md-preview-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
