'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Command {
  name: string;
  shortcut: string;
  action: () => void;
}

interface CommandPaletteProps {
  visible: boolean;
  onClose: () => void;
  commands: Command[];
}

export default function CommandPalette({ visible, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = commands.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (visible) {
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [visible]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && filtered.length > 0) {
      onClose();
      filtered[0].action();
    }
  }, [filtered, onClose]);

  if (!visible) return null;

  return (
    <div className="modal-overlay visible" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="command-palette">
        <input
          ref={inputRef}
          type="text"
          className="command-input"
          placeholder="Type a command..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <div className="command-list">
          {filtered.map((cmd, i) => (
            <div
              key={cmd.name}
              className={`command-item${i === 0 ? ' selected' : ''}`}
              onClick={() => {
                onClose();
                cmd.action();
              }}
            >
              <span>{cmd.name}</span>
              <span className="shortcut">{cmd.shortcut}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
