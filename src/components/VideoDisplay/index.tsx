import React, { useEffect, useRef } from 'react';
import { ILocalVideoTrack } from 'agora-rtc-sdk-ng';
import './styles.css';

interface VideoDisplayProps {
  isJoined: boolean;
  avatarVideoUrl: string;
  localVideoTrack: ILocalVideoTrack | null;
  cameraEnabled: boolean;
}

const VideoDisplay: React.FC<VideoDisplayProps> = ({ isJoined, avatarVideoUrl, localVideoTrack, cameraEnabled }) => {
  const localVideoRef = useRef<HTMLDivElement>(null);

  const isImageUrl = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  // Handle local video track playback
  useEffect(() => {
    if (localVideoTrack && localVideoRef.current && cameraEnabled) {
      try {
        localVideoTrack.play(localVideoRef.current);
      } catch (error) {
        console.error('Failed to play local video track:', error);
      }
    }
    
    // Cleanup when track is removed or component unmounts
    return () => {
      if (localVideoTrack && localVideoRef.current) {
        try {
          localVideoTrack.stop();
        } catch (error) {
          console.error('Failed to stop local video track:', error);
        }
      }
    };
  }, [localVideoTrack, cameraEnabled]);

  return (
    <div className="video-container">
      {isImageUrl(avatarVideoUrl) ? (
        <img
          id="placeholder-image"
          hidden={isJoined}
          src={avatarVideoUrl}
          alt="Avatar placeholder"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      ) : (
        <video id="placeholder-video" hidden={isJoined} src={avatarVideoUrl} loop muted playsInline autoPlay></video>
      )}
      <video id="remote-video"></video>
      
      {/* Local camera preview overlay */}
      {cameraEnabled && localVideoTrack && (
        <div className="local-video-overlay">
          <div ref={localVideoRef} className="local-video-container"></div>
        </div>
      )}
    </div>
  );
};

export default VideoDisplay;
