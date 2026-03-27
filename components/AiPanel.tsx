'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSpeechRecognition } from '@/lib/useSpeechRecognition';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AiPanelProps {
  visible: boolean;
  onClose: () => void;
}

export default function AiPanel({ visible, onClose }: AiPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isComposingRef = useRef(false);

  const {
    isSupported: micSupported,
    isListening,
    transcript,
    interimTranscript,
    start: startMic,
    stop: stopMic,
  } = useSpeechRecognition();

  // Insert finalized transcript into input
  const prevTranscriptRef = useRef('');
  useEffect(() => {
    if (transcript && transcript !== prevTranscriptRef.current) {
      prevTranscriptRef.current = transcript;
      setInput(prev => prev + transcript);
    }
  }, [transcript]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (visible) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [visible]);

  const handleSubmit = useCallback(async (text?: string) => {
    const question = (text || input).trim();
    if (!question || isLoading) return;

    setInput('');
    prevTranscriptRef.current = '';
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.error}` }]);
        setIsLoading(false);
        return;
      }

      // Stream the response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  assistantMsg += parsed.text;
                  setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', content: assistantMsg };
                    return updated;
                  });
                }
              } catch {
                // skip invalid JSON
              }
            }
          }
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Failed to connect to AI' }]);
    }

    setIsLoading(false);
  }, [input, isLoading]);

  const handleMicToggle = useCallback(() => {
    if (isListening) {
      stopMic();
      // Auto-submit after mic stops if there's text
      setTimeout(() => {
        const currentInput = input + (transcript || '');
        if (currentInput.trim()) {
          handleSubmit(currentInput.trim());
        }
      }, 500);
    } else {
      prevTranscriptRef.current = '';
      startMic();
    }
  }, [isListening, startMic, stopMic, input, transcript, handleSubmit]);

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, []);

  useEffect(() => {
    autoResize();
  }, [input, autoResize]);

  if (!visible) return null;

  return (
    <div className="ai-panel">
      <div className="ai-panel-header">
        <span className="ai-panel-title">AI Assistant</span>
        <button className="ai-panel-close" onClick={onClose}>×</button>
      </div>

      <div className="ai-messages">
        {messages.length === 0 && (
          <div className="ai-empty">
            <p>Ask me anything about your documents.</p>
            <p className="ai-hint">I can read all your files and answer questions.</p>
            <p className="ai-hint">Shift+Enter to send / Enter for new line</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`ai-message ai-message-${msg.role}`}>
            <div className="ai-message-label">{msg.role === 'user' ? 'You' : 'AI'}</div>
            <div className="ai-message-content">{msg.content || (isLoading && i === messages.length - 1 ? '...' : '')}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-input-area">
        <textarea
          ref={inputRef}
          className="ai-input ai-textarea"
          placeholder={isListening ? 'Listening...' : 'Ask about your documents... (Shift+Enter to send)'}
          value={input + (isListening ? interimTranscript : '')}
          onChange={(e) => {
            setInput(e.target.value);
          }}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={() => { isComposingRef.current = false; }}
          onKeyDown={(e) => {
            // Don't send during IME composition (e.g. Japanese input)
            if (isComposingRef.current) return;
            if (e.key === 'Enter' && e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
            if (e.key === 'Escape') onClose();
          }}
          disabled={isLoading}
          autoComplete="off"
          rows={1}
        />
        {micSupported && (
          <button
            className={`ai-mic-btn${isListening ? ' listening' : ''}`}
            onClick={handleMicToggle}
            title={isListening ? 'Stop & send' : 'Voice input'}
          >
            {isListening ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </button>
        )}
        <button
          className="ai-send-btn"
          onClick={() => handleSubmit()}
          disabled={isLoading || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
