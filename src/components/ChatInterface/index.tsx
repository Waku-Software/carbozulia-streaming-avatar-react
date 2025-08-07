import { useRef, useEffect, useCallback } from 'react';
import { RTCClient, interruptResponse } from '../../agoraHelper';
import { useMessageState } from '../../hooks/useMessageState';
import { useAgora } from '../../contexts/AgoraContext';
import './styles.css';

interface ChatInterfaceProps {
  client: RTCClient;
  connected: boolean;
  micEnabled: boolean;
  setMicEnabled: (enabled: boolean) => void;
  toggleMic?: () => Promise<void>;
  cameraEnabled: boolean;
  toggleCamera: () => Promise<void>;
  cameraError?: string | null;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  client,
  connected,
  micEnabled,
  setMicEnabled,
  toggleMic,
  cameraEnabled,
  toggleCamera,
  cameraError,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { setIsAvatarSpeaking } = useAgora();

  const { messages, inputMessage, setInputMessage, sendMessage, addReceivedMessage, clearMessages } = useMessageState({
    client,
    connected,
  });

  const handleStreamMessage = useCallback((_: number, body: Uint8Array) => {
    try {
      const msg = new TextDecoder().decode(body);
      const { v, type, mid, pld } = JSON.parse(msg);
      if (v !== 2) {
        return;
      }
      
      if (type === 'chat') {
        const { text } = pld;
        addReceivedMessage(`${type}_${mid}`, text);
      } else if (type === 'event') {
        const { event } = pld;
        if (event === 'audio_start') {
          setIsAvatarSpeaking(true);
        } else if (event === 'audio_end') {
          setIsAvatarSpeaking(false);
        }
        // Log any other events for debugging
        else {
        }
      }
    } catch (error) {
      console.error('Error handling stream message:', error);
      console.error('Message body:', body);
    }
  }, [setIsAvatarSpeaking, addReceivedMessage]);

  // Set up stream message listener
  useEffect(() => {
    if (connected) {
      // Store the handler reference so we can remove only this specific listener
      const messageHandler = handleStreamMessage;
      client.on('stream-message', messageHandler);
      return () => {
        // Remove only this specific listener, not all listeners
        client.off('stream-message', messageHandler);
      };
    }
  }, [client, connected, handleStreamMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add effect to clear messages when connection is lost
  useEffect(() => {
    if (!connected) {
      clearMessages();
    }
  }, [connected, clearMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleMicInternal = async () => {
    if (toggleMic) {
      await toggleMic();
      return;
    }

    // Fallback implementation if toggleMic is not provided
    if (!micEnabled) {
      setMicEnabled(true);
    } else {
      setMicEnabled(false);
    }
  };

  const toggleCameraInternal = async () => {
    if (!connected) return;

    try {
      // Toggle the camera
      await toggleCamera();
    } catch (error) {
      console.error('Failed to toggle camera:', error);
    }
  };

  return (
    <div className="chat-window">
      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`chat-message ${message.isSentByMe ? 'sent' : 'received'}`}>
            {message.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input">
        <button
          onClick={toggleMicInternal}
          disabled={!connected}
          className={`icon-button ${!connected ? 'disabled' : ''}`}
          title={micEnabled ? 'Disable microphone' : 'Enable microphone'}
        >
          <span className="material-icons">{micEnabled ? 'mic' : 'mic_off'}</span>
        </button>
        <button
          onClick={toggleCameraInternal}
          disabled={!connected}
          className={`icon-button ${!connected ? 'disabled' : ''} ${cameraError ? 'error' : ''}`}
          title={cameraError || (cameraEnabled ? 'Disable camera' : 'Enable camera')}
        >
          <span className="material-icons">{cameraEnabled ? 'videocam' : 'videocam_off'}</span>
        </button>
        {!micEnabled && (
          <>
            <input
              type="text"
              placeholder={'Type a message...'}
              disabled={!connected}
              className={!connected ? 'disabled' : ''}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyUp={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button
              onClick={sendMessage}
              disabled={!connected}
              className={`icon-button ${!connected ? 'disabled' : ''}`}
              title="Send message"
            >
              <span className="material-icons">send</span>
            </button>
            <button
              onClick={() => interruptResponse(client)}
              disabled={!connected}
              className={`icon-button ${!connected ? 'disabled' : ''}`}
              title="Interrupt response"
            >
              <span className="material-icons">stop</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
