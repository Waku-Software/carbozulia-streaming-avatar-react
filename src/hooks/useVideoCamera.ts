import { useState, useCallback, useRef, useEffect } from 'react';
import AgoraRTC, { ILocalVideoTrack, ICameraVideoTrack } from 'agora-rtc-sdk-ng';

interface UseVideoCameraReturn {
  cameraEnabled: boolean;
  localVideoTrack: ILocalVideoTrack | null;
  cameraError: string | null;
  enableCamera: () => Promise<void>;
  disableCamera: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  cleanup: () => Promise<void>;
}

export const useVideoCamera = (): UseVideoCameraReturn => {
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [localVideoTrack, setLocalVideoTrack] = useState<ILocalVideoTrack | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoTrackRef = useRef<ICameraVideoTrack | null>(null);

  const enableCamera = useCallback(async () => {
    try {
      setCameraError(null);

      // Check if we already have a track
      if (videoTrackRef.current) {
        await videoTrackRef.current.setEnabled(true);
        setLocalVideoTrack(videoTrackRef.current);
        setCameraEnabled(true);
        return;
      }

      // Create new camera video track
      const cameraTrack = await AgoraRTC.createCameraVideoTrack({
        encoderConfig: {
          width: 320,
          height: 240,
          frameRate: 15,
          bitrateMin: 200,
          bitrateMax: 500,
        },
      });

      videoTrackRef.current = cameraTrack;
      setLocalVideoTrack(cameraTrack);
      setCameraEnabled(true);
    } catch (error) {
      console.error('Failed to enable camera:', error);

      let errorMessage = 'Failed to access camera';
      if (error instanceof Error) {
        if (error.message.includes('Permission denied')) {
          errorMessage = 'Camera permission denied';
        } else if (error.message.includes('NotFoundError')) {
          errorMessage = 'No camera device found';
        } else if (error.message.includes('NotReadableError')) {
          errorMessage = 'Camera is being used by another application';
        }
      }

      setCameraError(errorMessage);
      setCameraEnabled(false);
      setLocalVideoTrack(null);
    }
  }, []);

  const disableCamera = useCallback(async () => {
    try {
      if (videoTrackRef.current) {
        // Stop the track first to release the device
        videoTrackRef.current.stop();
        // Then disable it
        await videoTrackRef.current.setEnabled(false);
      }

      setCameraEnabled(false);
      setLocalVideoTrack(null);
      setCameraError(null);
    } catch (error) {
      console.error('Failed to disable camera:', error);
    }
  }, []);

  const toggleCamera = useCallback(async () => {
    if (cameraEnabled) {
      await disableCamera();
    } else {
      await enableCamera();
    }
  }, [cameraEnabled, enableCamera, disableCamera]);

  // Cleanup function to properly close the track
  const cleanup = useCallback(async () => {
    try {
      if (videoTrackRef.current) {
        // Stop the track first
        videoTrackRef.current.stop();
        // Close the track to release the device
        videoTrackRef.current.close();
        videoTrackRef.current = null;
      }
      setLocalVideoTrack(null);
      setCameraEnabled(false);
      setCameraError(null);
    } catch (error) {
      console.error('Failed to cleanup camera track:', error);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    cameraEnabled,
    localVideoTrack,
    cameraError,
    enableCamera,
    disableCamera,
    toggleCamera,
    cleanup,
  };
};
