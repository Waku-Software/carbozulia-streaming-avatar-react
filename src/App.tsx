import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { ApiService } from './apiService';

import NetworkQualityDisplay from './components/NetworkQuality';
import VideoDisplay from './components/VideoDisplay';
import ChatInterface from './components/ChatInterface';
import { useAgora } from './contexts/AgoraContext';
import { useAudioControls } from './hooks/useAudioControls';
import { useStreaming } from './hooks/useStreaming';
import { useVideoCamera } from './hooks/useVideoCamera';

const App: React.FC = () => {
  const { client } = useAgora();
  const { micEnabled, setMicEnabled, toggleMic, cleanup: cleanupAudio } = useAudioControls();

  // Hardcoded for production: modeType is always "dialogue" (2)
  const modeType = 2;
  const language = import.meta.env.VITE_LANGUAGE || 'en';
  const voiceId = import.meta.env.VITE_VOICE_ID || '';
  const backgroundUrl = import.meta.env.VITE_BACKGROUND_URL || '';
  const voiceUrl = import.meta.env.VITE_VOICE_URL || '';
  const voiceParams: Record<string, unknown> = {};

  const openapiHost = import.meta.env.VITE_OPENAPI_HOST || '';
  const avatarId = import.meta.env.VITE_AVATAR_ID || '';
  const knowledgeId = import.meta.env.VITE_KNOWLEDGE_ID || '';
  const avatarVideoUrl = import.meta.env.VITE_AVATAR_VIDEO_URL || '';

  const openapiToken = import.meta.env.VITE_OPENAPI_TOKEN || '';
  const sessionDuration = Number(import.meta.env.VITE_SESSION_DURATION) || 10;
  const [api, setApi] = useState<ApiService | null>(null);

  // Ref to store the system message callback
  const systemMessageCallbackRef = useRef<
    ((messageId: string, text: string, systemType: string, metadata?: Record<string, unknown>) => void) | null
  >(null);

  useEffect(() => {
    if (openapiHost && openapiToken) {
      setApi(new ApiService(openapiHost, openapiToken));
    }
  }, [openapiHost, openapiToken]);

  const { cameraEnabled, localVideoTrack, cleanup: cleanupCamera } = useVideoCamera();

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
    localVideoTrack,
    systemMessageCallbackRef.current || undefined,
  );

  // Auto-cleanup media devices when streaming stops
  useEffect(() => {
    if (!connected) {
      // Cleanup both audio and video when streaming stops
      if (micEnabled) {
        cleanupAudio();
      }
      if (cameraEnabled) {
        cleanupCamera();
      }
    }
  }, [connected, micEnabled, cameraEnabled, cleanupAudio, cleanupCamera]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
      cleanupCamera();
    };
  }, [cleanupAudio, cleanupCamera]);

  return (
    <>
      <div className="right-side">
        <VideoDisplay
          isJoined={isJoined}
          avatarVideoUrl={avatarVideoUrl}
          localVideoTrack={localVideoTrack}
          cameraEnabled={cameraEnabled}
          startStreaming={startStreaming}
          closeStreaming={closeStreaming}
        />
        <ChatInterface
          client={client}
          connected={connected}
          micEnabled={micEnabled}
          setMicEnabled={setMicEnabled}
          toggleMic={toggleMic}
          onSystemMessageCallback={(callback) => {
            systemMessageCallbackRef.current = callback;
          }}
        />
        <div>{isJoined && remoteStats && <NetworkQualityDisplay stats={remoteStats} />}</div>
      </div>
    </>
  );
};

export default App;
