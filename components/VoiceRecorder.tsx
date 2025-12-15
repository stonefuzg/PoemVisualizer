import React, { useState, useRef } from 'react';
import { Mic, Square, Trash2, CheckCircle, RefreshCcw } from 'lucide-react';
import { Button } from './Button';

interface VoiceRecorderProps {
  onRecordingComplete: (base64Audio: string | null) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' }); // Browsers usually record to webm
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            onRecordingComplete(reader.result);
            setHasRecording(true);
          }
        };
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please ensure permissions are granted.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const clearRecording = () => {
    setHasRecording(false);
    onRecordingComplete(null);
  };

  if (hasRecording) {
    return (
      <div className="flex items-center gap-3 bg-paper-200 p-2 rounded-lg border border-stone-300">
        <div className="flex items-center gap-2 text-jade-500 font-serif text-sm px-2">
          <CheckCircle size={18} />
          <span>Voice Sample Recorded</span>
        </div>
        <button 
          onClick={clearRecording}
          className="p-2 text-stone-500 hover:text-seal-red transition-colors"
          title="Delete and Re-record"
        >
          <RefreshCcw size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {!isRecording ? (
        <button
          onClick={startRecording}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-ink-800 text-white hover:bg-ink-900 transition-colors text-sm font-serif"
        >
          <Mic size={16} />
          Record Voice Sample
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 animate-pulse transition-colors text-sm font-serif"
        >
          <Square size={16} fill="currentColor" />
          Stop Recording
        </button>
      )}
      <span className="text-xs text-stone-500 font-serif italic hidden md:inline">
        {isRecording ? "Recording..." : "Clone your voice (optional)"}
      </span>
    </div>
  );
};