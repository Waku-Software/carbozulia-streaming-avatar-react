import { useState, useEffect } from 'react';
import './App.css';
import { ApiService } from './apiService';

import ConfigurationPanel from './components/ConfigurationPanel';
import NetworkQualityDisplay from './components/NetworkQuality';
import VideoDisplay from './components/VideoDisplay';
import ChatInterface from './components/ChatInterface';
import { useAgora } from './contexts/AgoraContext';
import { useAudioControls } from './hooks/useAudioControls';
import { useStreaming } from './hooks/useStreaming';

function App() {
  const { client } = useAgora();
  const { micEnabled, setMicEnabled, toggleMic } = useAudioControls();

  const [modeType, setModeType] = useState(Number(import.meta.env.VITE_MODE_TYPE) || 2);
  const [language, setLanguage] = useState(import.meta.env.VITE_LANGUAGE || 'en');
  const [voiceId, setVoiceId] = useState(import.meta.env.VITE_VOICE_ID || '');
  const [backgroundUrl, setBackgroundUrl] = useState(import.meta.env.VITE_BACKGROUND_URL || '');
  const [voiceUrl, setVoiceUrl] = useState(import.meta.env.VITE_VOICE_URL || '');
  const [voiceParams, setVoiceParams] = useState<Record<string, any>>({});

  const [openapiHost, setOpenapiHost] = useState(import.meta.env.VITE_OPENAPI_HOST || '');
  const [avatarId, setAvatarId] = useState(import.meta.env.VITE_AVATAR_ID || '');
  const [knowledgeId, setKnowledgeId] = useState('');
  const [avatarVideoUrl, setAvatarVideoUrl] = useState(import.meta.env.VITE_AVATAR_VIDEO_URL || '');

  const [openapiToken, setOpenapiToken] = useState(import.meta.env.VITE_OPENAPI_TOKEN || '');
  const [sessionDuration, setSessionDuration] = useState(10);
  const [api, setApi] = useState<ApiService | null>(null);

  useEffect(() => {
    if (openapiHost && openapiToken) {
      setApi(new ApiService(openapiHost, openapiToken));
    }
  }, [openapiHost, openapiToken]);

  const { isJoined, connected, remoteStats, startStreaming, closeStreaming } = useStreaming(
    avatarId,
    knowledgeId,
    sessionDuration,
    voiceId,
    voiceUrl,
    backgroundUrl,
    language,
    modeType,
    voiceParams,
    api,
  );

  return (
    <>
      <ConfigurationPanel
        openapiHost={openapiHost}
        setOpenapiHost={setOpenapiHost}
        openapiToken={openapiToken}
        setOpenapiToken={setOpenapiToken}
        sessionDuration={sessionDuration}
        setSessionDuration={setSessionDuration}
        modeType={modeType}
        setModeType={setModeType}
        avatarId={avatarId}
        setAvatarId={setAvatarId}
        voiceId={voiceId}
        setVoiceId={setVoiceId}
        language={language}
        setLanguage={setLanguage}
        backgroundUrl={backgroundUrl}
        setBackgroundUrl={setBackgroundUrl}
        voiceUrl={voiceUrl}
        setVoiceUrl={setVoiceUrl}
        knowledgeId={knowledgeId}
        setKnowledgeId={setKnowledgeId}
        voiceParams={voiceParams}
        setVoiceParams={setVoiceParams}
        isJoined={isJoined}
        startStreaming={startStreaming}
        closeStreaming={closeStreaming}
        api={api}
        setAvatarVideoUrl={setAvatarVideoUrl}
      />
      <div className="right-side">
        <VideoDisplay isJoined={isJoined} avatarVideoUrl={avatarVideoUrl} />
        <ChatInterface
          client={client}
          connected={connected}
          micEnabled={micEnabled}
          setMicEnabled={setMicEnabled}
          toggleMic={toggleMic}
        />
        <div>{isJoined && remoteStats && <NetworkQualityDisplay stats={remoteStats} />}</div>
      </div>
    </>
  );
}

export default App;
