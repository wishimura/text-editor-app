'use client';

interface TitleBarProps {
  fileName: string;
  onToggleSidebar: () => void;
}

export default function TitleBar({ fileName, onToggleSidebar }: TitleBarProps) {
  return (
    <div className="title-bar">
      <div className="title-bar-left">
        <span className="app-icon">⚛</span>
        <span className="app-title">Atom Editor</span>
      </div>
      <div className="title-bar-center">{fileName}</div>
      <div className="title-bar-right">
        <button className="title-btn" onClick={onToggleSidebar} title="Toggle Sidebar">
          ☰
        </button>
      </div>
    </div>
  );
}
