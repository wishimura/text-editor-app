export interface Document {
  id: string;
  title: string;
  content: string;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface FileIcon {
  icon: string;
  cls: string;
}

export const fileIcons: Record<string, FileIcon> = {
  html: { icon: '⟨⟩', cls: 'file-icon-html' },
  css: { icon: '#', cls: 'file-icon-css' },
  js: { icon: 'JS', cls: 'file-icon-js' },
  ts: { icon: 'TS', cls: 'file-icon-ts' },
  json: { icon: '{}', cls: 'file-icon-json' },
  md: { icon: '¶', cls: 'file-icon-md' },
  default: { icon: '○', cls: 'file-icon-default' },
};

export const langMap: Record<string, string> = {
  html: 'HTML',
  css: 'CSS',
  js: 'JavaScript',
  ts: 'TypeScript',
  json: 'JSON',
  md: 'Markdown',
  plaintext: 'Plain Text',
};

export function getFileIcon(language: string): FileIcon {
  return fileIcons[language] || fileIcons.default;
}

export function getLangFromTitle(title: string): string {
  const ext = title.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    html: 'html', htm: 'html',
    css: 'css',
    js: 'js', jsx: 'js', mjs: 'js',
    ts: 'ts', tsx: 'ts',
    json: 'json',
    md: 'md', markdown: 'md',
  };
  return map[ext] || 'plaintext';
}
