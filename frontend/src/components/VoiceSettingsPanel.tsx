import React from 'react';
import type { VoiceSettings } from '../hooks/useVoice';
import { X, Settings2 } from 'lucide-react';

interface VoiceSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VoiceSettings;
  updateSettings: (settings: Partial<VoiceSettings>) => void;
  voices: { name: string; id: string }[];
}

export const VoiceSettingsPanel: React.FC<VoiceSettingsPanelProps> = ({
  isOpen,
  onClose,
  settings,
  updateSettings,
  voices
}) => {
  if (!isOpen) return null;

  const tones = ['Natural', 'Professional', 'Friendly', 'Calm', 'Confident', 'Energetic'];

  return (
    <div className="absolute bottom-full left-0 mb-4 w-72 md:w-80 bg-[var(--bg-tertiary)] border border-[var(--card-border)] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-2 text-[var(--text-primary)] font-medium">
          <Settings2 size={16} className="text-purple-400" />
          <span>Voice Settings</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors text-[var(--text-secondary)]">
          <X size={16} />
        </button>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Auto Play */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-[var(--text-primary)]">Auto-speak Answers</label>
          <button
            onClick={() => updateSettings({ autoPlay: !settings.autoPlay })}
            className={`w-11 h-6 rounded-full transition-colors relative ${settings.autoPlay ? 'bg-purple-500' : 'bg-white/10'}`}
          >
            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.autoPlay ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Tone Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">AI Personality Tone</label>
          <div className="grid grid-cols-2 gap-2">
            {tones.map(tone => (
              <button
                key={tone}
                onClick={() => updateSettings({ tone })}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors text-left border ${
                  settings.tone === tone 
                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-200' 
                    : 'bg-white/5 border-white/5 text-[var(--text-secondary)] hover:bg-white/10'
                }`}
              >
                {tone}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Speaker Voice</label>
          <select
            value={settings.selectedVoice || ''}
            onChange={(e) => updateSettings({ selectedVoice: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-purple-500"
          >
            {voices.map(voice => (
              <option key={voice.id} value={voice.id} className="bg-gray-800 text-white">
                {voice.name}
              </option>
            ))}
          </select>
        </div>

        {/* Speed */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Speech Speed</label>
            <span className="text-xs text-[var(--text-primary)]">{settings.speed}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={settings.speed}
            onChange={(e) => updateSettings({ speed: parseFloat(e.target.value) })}
            className="w-full accent-purple-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
