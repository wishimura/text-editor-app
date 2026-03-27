'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSpeechRecognition } from '@/lib/useSpeechRecognition';

interface VoiceNewDocProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (text: string) => void;
}

export default function VoiceNewDoc({ visible, onClose, onComplete }: VoiceNewDocProps) {
  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
  } = useSpeechRecognition();

  const hasStartedRef = useRef(false);

  // Auto-start listening when modal opens
  useEffect(() => {
    if (visible && isSupported && !hasStartedRef.current) {
      hasStartedRef.current = true;
      start();
    }
    if (!visible) {
      hasStartedRef.current = false;
    }
  }, [visible, isSupported, start]);

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  const handleSave = useCallback(() => {
    const text = transcript + (interimTranscript ? ' ' + interimTranscript : '');
    if (text.trim()) {
      onComplete(text.trim());
    }
    onClose();
  }, [transcript, interimTranscript, onComplete, onClose]);

  const handleCancel = useCallback(() => {
    stop();
    onClose();
  }, [stop, onClose]);

  if (!visible) return null;

  const currentText = transcript + (interimTranscript ? interimTranscript : '');

  return (
    <div className="modal-overlay visible" onClick={(e) => {
      if (e.target === e.currentTarget) handleCancel();
    }}>
      <div className="voice-modal">
        <div className="voice-modal-header">
          <h3>Voice → New Document</h3>
          <button className="voice-modal-close" onClick={handleCancel}>×</button>
        </div>

        <div className="voice-modal-body">
          {!isSupported ? (
            <p className="voice-error">Speech recognition is not supported in this browser. Please use Chrome.</p>
          ) : (
            <>
              <div className={`voice-indicator${isListening ? ' active' : ''}`}>
                <div className="voice-pulse" />
                <span>{isListening ? 'Listening...' : 'Stopped'}</span>
              </div>

              <div className="voice-transcript-box">
                {currentText || (
                  <span className="voice-placeholder">
                    {isListening ? 'Start speaking...' : 'No speech detected'}
                  </span>
                )}
                {interimTranscript && (
                  <span className="voice-interim">{interimTranscript}</span>
                )}
              </div>

              {error && <p className="voice-error">{error}</p>}
            </>
          )}
        </div>

        <div className="voice-modal-footer">
          {isListening ? (
            <button className="voice-btn voice-btn-stop" onClick={handleStop}>
              Stop Recording
            </button>
          ) : (
            <button className="voice-btn voice-btn-start" onClick={start}>
              Record Again
            </button>
          )}
          <button
            className="voice-btn voice-btn-save"
            onClick={handleSave}
            disabled={!currentText.trim()}
          >
            Save as Document
          </button>
        </div>
      </div>
    </div>
  );
}
