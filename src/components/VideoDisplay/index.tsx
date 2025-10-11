import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ILocalVideoTrack } from 'agora-rtc-sdk-ng';
import { useAgora } from '../../contexts/AgoraContext';
import './styles.css';
import { log } from '../../agoraHelper';
import smartdevLogo from '../../assets/smartdev-logo.svg';

interface VideoDisplayProps {
  isJoined: boolean;
  avatarVideoUrl: string;
  localVideoTrack: ILocalVideoTrack | null;
  cameraEnabled: boolean;
  startStreaming: () => Promise<void>;
  closeStreaming: () => Promise<void>;
}

const VideoDisplay: React.FC<VideoDisplayProps> = ({
  isJoined,
  avatarVideoUrl,
  localVideoTrack,
  cameraEnabled,
  startStreaming,
  closeStreaming,
}) => {
  const localVideoRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isAvatarSpeaking } = useAgora();

  // State for dragging, resizing, and view switching
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isViewSwitched, setIsViewSwitched] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [justFinishedOperation, setJustFinishedOperation] = useState(false);

  // State for remote video playing status
  const [isRemoteVideoPlaying, setIsRemoteVideoPlaying] = useState(false);

  // State for button loading
  const [isStarting, setIsStarting] = useState(false);

  const isImageUrl = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  const handleStartStreaming = async () => {
    setIsStarting(true);
    try {
      await startStreaming();
    } catch (error) {
      console.error('Error starting streaming:', error);
    } finally {
      setIsStarting(false);
    }
  };

  const handleCloseStreaming = async () => {
    try {
      await closeStreaming();
    } catch (error) {
      console.error('Error closing streaming:', error);
    }
  };

  // Drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!overlayRef.current || !containerRef.current) return;

    const overlay = overlayRef.current;
    const overlayRect = overlay.getBoundingClientRect();

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - overlayRect.left,
      y: e.clientY - overlayRect.top,
    });

    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (!overlayRef.current || !containerRef.current) return;

    const overlay = overlayRef.current;

    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: overlay.offsetWidth,
      height: overlay.offsetHeight,
    });

    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!overlayRef.current || !containerRef.current) return;

      const container = containerRef.current;
      const overlay = overlayRef.current;
      const containerRect = container.getBoundingClientRect();

      if (isDragging) {
        const newX = e.clientX - containerRect.left - dragOffset.x;
        const newY = e.clientY - containerRect.top - dragOffset.y;

        // Constrain within container bounds
        const maxX = container.offsetWidth - overlay.offsetWidth;
        const maxY = container.offsetHeight - overlay.offsetHeight;

        const constrainedX = Math.max(0, Math.min(newX, maxX));
        const constrainedY = Math.max(0, Math.min(newY, maxY));

        overlay.style.left = `${constrainedX}px`;
        overlay.style.top = `${constrainedY}px`;
        overlay.style.right = 'auto';
        overlay.style.bottom = 'auto';
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;

        const newWidth = Math.max(160, Math.min(resizeStart.width + deltaX, container.offsetWidth * 0.5));
        const newHeight = Math.max(120, Math.min(resizeStart.height + deltaY, container.offsetHeight * 0.5));

        overlay.style.width = `${newWidth}px`;
        overlay.style.height = `${newHeight}px`;
      }
    },
    [isDragging, isResizing, dragOffset, resizeStart],
  );

  const handleMouseUp = useCallback(() => {
    const wasDraggingOrResizing = isDragging || isResizing;

    setIsDragging(false);
    setIsResizing(false);

    // If we were dragging or resizing, prevent click events for a short time
    if (wasDraggingOrResizing) {
      setJustFinishedOperation(true);
      setTimeout(() => setJustFinishedOperation(false), 100);
    }
  }, [isDragging, isResizing]);

  // View switching handler
  const handleViewSwitch = useCallback(
    (e: React.MouseEvent) => {
      // Prevent switching if we just finished a drag or resize operation
      if (justFinishedOperation || isDragging || isResizing) {
        e.preventDefault();
        return;
      }

      setIsViewSwitched(!isViewSwitched);
    },
    [isViewSwitched, justFinishedOperation, isDragging, isResizing],
  );

  // Handle mouse events for dragging and resizing
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Handle local video track playback based on view switching
  useEffect(() => {
    if (localVideoTrack && cameraEnabled) {
      try {
        // Always stop the track first to avoid conflicts
        localVideoTrack.stop();

        // Add a small delay to ensure the stop operation completes
        setTimeout(() => {
          try {
            if (!isViewSwitched) {
              // Normal mode, local video in overlay
              if (localVideoRef.current) {
                localVideoTrack.play(localVideoRef.current);
              }
            } else {
              // When switched, local video goes to a main video element
              const mainLocalVideo = document.getElementById('main-local-video');
              if (mainLocalVideo) {
                localVideoTrack.play(mainLocalVideo);
              }
            }
          } catch (error) {
            console.error('Failed to play local video track after delay:', error);
          }
        }, 50);
      } catch (error) {
        console.error('Failed to stop local video track:', error);
      }
    }

    // Cleanup when track is removed, camera is disabled, or component unmounts
    return () => {
      if (localVideoTrack) {
        try {
          localVideoTrack.stop();
        } catch (error) {
          console.error('Failed to stop local video track in cleanup:', error);
        }
      }
    };
  }, [localVideoTrack, cameraEnabled, isViewSwitched]);

  // Additional cleanup when camera is disabled
  useEffect(() => {
    if (!cameraEnabled && localVideoTrack) {
      try {
        localVideoTrack.stop();
      } catch (error) {
        console.error('Failed to stop video track when camera disabled:', error);
      }
    }
  }, [cameraEnabled, localVideoTrack]);

  // Monitor remote video playing state
  useEffect(() => {
    const remoteVideo = document.getElementById('remote-video') as HTMLVideoElement;
    if (!remoteVideo) return;

    const checkVideoReady = () => {
      // Only show remote video if it's playing AND has loaded displayable data
      const isReady = !remoteVideo.paused && remoteVideo.readyState >= 2;
      setIsRemoteVideoPlaying(isReady);
      if (isReady) {
        log('remote video is ready');
      }
    };

    const handleStop = () => setIsRemoteVideoPlaying(false);

    // Check when video can start playing with data
    remoteVideo.addEventListener('canplay', checkVideoReady);
    remoteVideo.addEventListener('playing', checkVideoReady);
    remoteVideo.addEventListener('pause', handleStop);
    remoteVideo.addEventListener('ended', handleStop);
    remoteVideo.addEventListener('loadstart', handleStop);

    return () => {
      remoteVideo.removeEventListener('canplay', checkVideoReady);
      remoteVideo.removeEventListener('playing', checkVideoReady);
      remoteVideo.removeEventListener('pause', handleStop);
      remoteVideo.removeEventListener('ended', handleStop);
      remoteVideo.removeEventListener('loadstart', handleStop);
    };
  }, [isJoined]);

  // Reset remote video state when stream disconnects
  useEffect(() => {
    if (!isJoined) {
      setIsRemoteVideoPlaying(false);
      log('Stream disconnected, switching back to local video');
    }
  }, [isJoined]);

  return (
    <div ref={containerRef} className="video-container">
      {/* Branding Logos */}
      <div className="branding-overlay">
        <img
          src="https://waku-public-2.s3.us-east-1.amazonaws.com/logo_carbozulia.png"
          alt="Carbozulia Logo"
          className="brand-logo carbozulia-logo"
        />
        <img src={smartdevLogo} alt="Smartdev Logo" className="brand-logo waku-logo" />
      </div>

      {/* Start/Stop Streaming Button Overlay */}
      <div className="streaming-control-overlay">
        {!isJoined ? (
          <button className="start-streaming-button" onClick={handleStartStreaming} disabled={isStarting}>
            {isStarting ? 'Conectando...' : 'Hablar con Cheito'}
          </button>
        ) : (
          <button className="stop-streaming-button" onClick={handleCloseStreaming}>
            Terminar Conversación
          </button>
        )}
      </div>

      {/* Main video area - shows avatar or local camera based on switch state */}
      {!isViewSwitched ? (
        <>
          {isImageUrl(avatarVideoUrl) ? (
            <img
              id="placeholder-image"
              hidden={isRemoteVideoPlaying}
              src={avatarVideoUrl}
              alt="Avatar placeholder"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <video
              id="placeholder-video"
              hidden={isRemoteVideoPlaying}
              src={avatarVideoUrl}
              loop
              muted
              playsInline
              autoPlay
            ></video>
          )}
          <video id="remote-video" style={{ display: isRemoteVideoPlaying ? 'block' : 'none' }}></video>

          {/* Speaking indicator overlay */}
          {isAvatarSpeaking && (
            <div className="speaking-indicator">
              <div className="speaking-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="speaking-text">Speaking...</span>
            </div>
          )}
        </>
      ) : (
        // When switched, show local camera in main area
        <>
          <div id="main-local-video" style={{ width: '100%', height: '100%', background: '#000' }}>
            {/* Local video will be played here via effect */}
          </div>
          {/* Still keep remote video playing in background, even when switched */}
          <video id="remote-video" style={{ display: 'none' }}></video>
        </>
      )}

      {/* Local camera preview overlay - shows avatar when switched */}
      {cameraEnabled && localVideoTrack && (
        <div
          ref={overlayRef}
          className={`local-video-overlay ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''} ${isViewSwitched ? 'switching' : ''}`}
          onClick={handleViewSwitch}
        >
          {/* Custom drag handle */}
          <div
            className="drag-handle"
            onMouseDown={handleDragStart}
            onClick={(e) => e.stopPropagation()}
            title="Drag to move"
          />

          {/* Custom resize handle */}
          <div
            className="resize-handle"
            onMouseDown={handleResizeStart}
            onClick={(e) => e.stopPropagation()}
            title="Drag to resize"
          />

          <div ref={localVideoRef} className="local-video-container">
            {isViewSwitched && (
              // When switched, show avatar in the overlay
              <>
                {isImageUrl(avatarVideoUrl) ? (
                  <img
                    src={avatarVideoUrl}
                    alt="Avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <video
                    src={avatarVideoUrl}
                    loop
                    muted
                    playsInline
                    autoPlay
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  ></video>
                )}
                <div
                  id="remote-video-overlay"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: isRemoteVideoPlaying ? 'block' : 'none',
                  }}
                ></div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoDisplay;
