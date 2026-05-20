/**
 * VoiceInput - Speech-to-text component with visual feedback
 * Uses Web Speech API for voice recognition
 */

import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";

export default function VoiceInput({ onTranscript, disabled }) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join("");
        onTranscript?.(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscript]);

  const toggleListening = () => {
    if (!recognitionRef.current || disabled) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={disabled}
      className={`p-2 rounded-xl transition-all active:scale-90 ${
        isListening 
          ? "bg-red-500/20 text-red-400 animate-pulse" 
          : "hover:bg-secondary/50"
      } disabled:opacity-30`}
      title={isListening ? "Stop listening" : "Voice input"}
    >
      {isListening ? (
        <MicOff className="w-4 h-4" />
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </button>
  );
}