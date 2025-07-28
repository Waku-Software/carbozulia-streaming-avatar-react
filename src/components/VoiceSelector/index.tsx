import { useState, useEffect } from 'react';
import { Voice } from '../../apiService';
import './styles.css';

interface VoiceSelectorProps {
  voiceId: string;
  setVoiceId: (id: string) => void;
  voices: Voice[];
  voiceUrl: string;
  setVoiceUrl: (url: string) => void;
}

export default function VoiceSelector({ voiceId, setVoiceId, voices, voiceUrl, setVoiceUrl }: VoiceSelectorProps) {
  const [useManualVoiceId, setUseManualVoiceId] = useState(false);
  const [voiceUrlInput, setVoiceUrlInput] = useState(voiceUrl);
  const [voiceIdInput, setVoiceIdInput] = useState(voiceId);

  // Sync local voice URL input with prop
  useEffect(() => {
    setVoiceUrlInput(voiceUrl);
  }, [voiceUrl]);

  // Sync local voice ID input with prop
  useEffect(() => {
    setVoiceIdInput(voiceId);
  }, [voiceId]);

  return (
    <div className="voice-selector">
      <div>
        <label>
          Voice:
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!useManualVoiceId ? (
              <select value={voiceId} onChange={(e) => setVoiceId(e.target.value)} disabled={!voices.length}>
                <option value="">Select a voice</option>
                {voices.map((voice, index) => (
                  <option key={index} value={voice.voice_id}>
                    {voice.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={voiceIdInput}
                onChange={(e) => setVoiceIdInput(e.target.value)}
                onBlur={(e) => setVoiceId(e.target.value)}
                placeholder="Enter voice ID"
              />
            )}
            <button
              onClick={() => setUseManualVoiceId(!useManualVoiceId)}
              className="icon-button"
              title={useManualVoiceId ? 'Switch to dropdown' : 'Switch to manual input'}
            >
              <span className="material-icons">{useManualVoiceId ? 'list' : 'edit'}</span>
            </button>
          </div>
        </label>
      </div>
      <div>
        <label>
          Voice URL:
          <input
            type="text"
            value={voiceUrlInput}
            onChange={(e) => setVoiceUrlInput(e.target.value)}
            onBlur={(e) => setVoiceUrl(e.target.value)}
            placeholder="Enter voice URL"
          />
        </label>
      </div>
    </div>
  );
}
