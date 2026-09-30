import { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '../api';

export interface VoiceSettings {
  tone: string;
  speed: number;
  pitch: number;
  volume: number;
  autoPlay: boolean;
  selectedVoice: string | null;
}

const TONE_PRESETS: Record<string, { rate: number, pitch: number, volume: number }> = {
  Natural: { rate: 1.0, pitch: 1.0, volume: 1.0 },
  Professional: { rate: 0.95, pitch: 1.0, volume: 1.0 },
  Friendly: { rate: 1.05, pitch: 1.08, volume: 1.0 },
  Energetic: { rate: 1.12, pitch: 1.12, volume: 1.0 },
  Calm: { rate: 0.88, pitch: 0.92, volume: 1.0 },
  Confident: { rate: 1.0, pitch: 0.95, volume: 1.0 },
};

export const useVoice = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsProvider, setTtsProvider] = useState<'elevenlabs' | 'browser' | 'none'>('none');
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(true);
  
  const [voices] = useState([
    { name: 'Rachel (Calm)', id: '21m00Tcm4TlvDq8ikWAM' },
    { name: 'Drew (News)', id: '29vD33N1CtxCmqQRPOHJ' },
    { name: 'Clyde (War veteran)', id: '2EiwWnXFnvU5JabPnv8n' },
    { name: 'Adam (Deep)', id: 'pNInz6obpgDQGcFmaJgB' },
    { name: 'Domi (Strong)', id: 'AZnzlk1XvdvUeBnXmlld' },
    { name: 'Bella (Soft)', id: 'EXAVITQu4vr4xnSDxMaL' }
  ]);
  
  const [settings, setSettings] = useState<VoiceSettings>(() => {
    const saved = localStorage.getItem('voiceSettings');
    let parsed = saved ? JSON.parse(saved) : null;
    
    const validIds = ['21m00Tcm4TlvDq8ikWAM', '29vD33N1CtxCmqQRPOHJ', '2EiwWnXFnvU5JabPnv8n', 'pNInz6obpgDQGcFmaJgB', 'AZnzlk1XvdvUeBnXmlld', 'EXAVITQu4vr4xnSDxMaL'];
    if (parsed && parsed.selectedVoice && !validIds.includes(parsed.selectedVoice)) {
      parsed.selectedVoice = '21m00Tcm4TlvDq8ikWAM';
    }
    
    return parsed || {
      tone: 'Natural',
      speed: 1,
      pitch: 1,
      volume: 1,
      autoPlay: false,
      selectedVoice: '21m00Tcm4TlvDq8ikWAM'
    };
  });

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    localStorage.setItem('voiceSettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    // Check support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setSupported(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
          else interimTranscript += event.results[i][0].transcript;
        }
        setTranscript(finalTranscript || interimTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => setIsListening(false);
    }

    if (!settings.selectedVoice) {
      setSettings(prev => ({ ...prev, selectedVoice: '21m00Tcm4TlvDq8ikWAM' }));
    }

    // Load browser voices
    const loadVoices = () => setBrowserVoices(window.speechSynthesis.getVoices());
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  const startListening = useCallback(() => {
    if (!supported || !recognitionRef.current) return;
    setTranscript('');
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      console.error(e);
    }
  }, [supported]);

  const stopListening = useCallback(() => {
    if (!supported || !recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
  }, [supported]);

  // speakWithBrowser accepts a speakId to guard against stale calls
  const speakWithBrowser = useCallback((text: string, speakId: number) => {
    if (!("speechSynthesis" in window)) {
      console.warn("Browser speech synthesis is not supported.");
      setIsSpeaking(false);
      setTtsProvider('none');
      return;
    }

    window.speechSynthesis.cancel();
    window.speechSynthesis.resume(); // Fixes a browser bug where cancel() fails if the engine is paused

    // Chrome requires a slight delay after cancel() before speak() or it may queue incorrectly
    // We re-check speakId inside the timeout: if a newer speak() was already called, discard this one
    setTimeout(() => {
      if (speakId !== currentSpeakId.current) return;

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Voice selection
      let voiceToUse = browserVoices.find(v => v.lang === 'en-IN');
      if (!voiceToUse) voiceToUse = browserVoices.find(v => v.lang.startsWith('en'));
      if (!voiceToUse && browserVoices.length > 0) voiceToUse = browserVoices[0];
      
      if (voiceToUse) utterance.voice = voiceToUse;

      // Tone modifiers
      const preset = TONE_PRESETS[settings.tone] || TONE_PRESETS['Natural'];
      
      utterance.rate = preset.rate * settings.speed;
      utterance.pitch = preset.pitch * settings.pitch;
      utterance.volume = preset.volume * settings.volume;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setTtsProvider('browser');
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        setTtsProvider('none');
      };
      utterance.onerror = (e) => {
        console.warn('Browser TTS error', e);
        setIsSpeaking(false);
        setTtsProvider('none');
      };

      window.speechSynthesis.speak(utterance);
    }, 80);
  }, [browserVoices, settings]);

  const currentSpeakId = useRef(0);

  const stopSpeaking = useCallback(() => {
    currentSpeakId.current++; // Invalidate any pending speak
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
    setIsSpeaking(false);
    setTtsProvider('none');
  }, []);

  const speak = useCallback(async (text: string) => {
    // Increment before stopSpeaking so stopSpeaking's increment doesn't race
    const speakId = ++currentSpeakId.current;

    // Stop any existing audio immediately
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
    
    const cleanText = text.replace(/[#*`_]/g, '');
    setIsSpeaking(true);
    setTtsProvider('elevenlabs');
    
    try {
      const response = await apiClient('/api/chat/tts', {
        method: 'POST',
        body: JSON.stringify({ 
          text: cleanText, 
          voice_id: settings.selectedVoice || '21m00Tcm4TlvDq8ikWAM',
          tone: settings.tone
        })
      });

      if (speakId !== currentSpeakId.current) return;

      if (!response.ok) {
        console.warn(`ElevenLabs TTS failed with status ${response.status}. Falling back to browser TTS...`);
        speakWithBrowser(cleanText, speakId);
        return;
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
         const data = await response.json();
         if (speakId !== currentSpeakId.current) return;
         if (data.fallback || !data.success) {
            console.warn("ElevenLabs TTS returned JSON error, falling back to browser...", data.error);
            speakWithBrowser(cleanText, speakId);
            return;
         }
      }
      
      const blob = await response.blob();
      if (speakId !== currentSpeakId.current) return;
      
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      audio.playbackRate = settings.speed;
      audio.volume = settings.volume;
      
      audio.onended = () => {
        setIsSpeaking(false);
        setTtsProvider('none');
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        setTtsProvider('none');
        URL.revokeObjectURL(url);
        console.warn("Audio element error, falling back to browser");
        speakWithBrowser(cleanText, speakId);
      };
      
      audioRef.current = audio;
      audio.play();
    } catch (e) {
      if (speakId !== currentSpeakId.current) return;
      console.warn("TTS unavailable: Failed to fetch ElevenLabs TTS. Using browser TTS.", e);
      speakWithBrowser(cleanText, speakId);
    }
  }, [settings, speakWithBrowser]);

  const updateSettings = useCallback((newSettings: Partial<VoiceSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);


  return {
    isListening,
    isSpeaking,
    ttsProvider,
    transcript,
    setTranscript,
    supported,
    voices,
    settings,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    updateSettings
  };
};
