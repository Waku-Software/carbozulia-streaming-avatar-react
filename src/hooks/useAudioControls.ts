import { useState, useCallback, useRef, useEffect } from 'react';
import AgoraRTC, { IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { useAgora } from '../contexts/AgoraContext';

export const useAudioControls = () => {
  const { client } = useAgora();
  const [micEnabled, setMicEnabled] = useState(false);
  const audioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);

  const toggleMic = useCallback(async () => {
    if (!micEnabled) {
      try {
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: 'speech_low_quality',
          AEC: true,
          ANS: true,
          AGC: true,
        });
        
        await client.publish(audioTrack);
        audioTrackRef.current = audioTrack;
        setMicEnabled(true);
      } catch (error) {
        console.error('Failed to enable microphone:', error);
        setMicEnabled(false);
      }
    } else {
      try {
        if (audioTrackRef.current) {
          audioTrackRef.current.stop();
          audioTrackRef.current.close();
          await client.unpublish(audioTrackRef.current);
          audioTrackRef.current = null;
        }
        setMicEnabled(false);
      } catch (error) {
        console.error('Failed to disable microphone:', error);
      }
    }
  }, [micEnabled, client]);

  // Cleanup function to properly release the audio track
  const cleanup = useCallback(async () => {
    try {
      if (audioTrackRef.current) {
        audioTrackRef.current.stop();
        audioTrackRef.current.close();
        await client.unpublish(audioTrackRef.current);
        audioTrackRef.current = null;
      }
      setMicEnabled(false);
    } catch (error) {
      console.error('Failed to cleanup audio track:', error);
    }
  }, [client]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    micEnabled,
    setMicEnabled,
    toggleMic,
    cleanup,
  };
};
