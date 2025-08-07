import { useRef, useEffect, useCallback } from 'react';
import { RTCClient, interruptResponse } from '../../agoraHelper';
import { useMessageState, SystemEventType, UserTriggeredEventType } from '../../hooks/useMessageState';
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
  onSystemEvent?: (type: UserTriggeredEventType, message: string) => void;
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

  const {
    messages,
    inputMessage,
    setInputMessage,
    sendMessage,
    addReceivedMessage,
    clearMessages,
    formatTime,
    shouldShowTimeSeparator,
  } = useMessageState({
    client,
    connected,
  });

  const handleStreamMessage = useCallback(
    (_: number, body: Uint8Array) => {
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
            addReceivedMessage(`event_${mid}`, '🎤 Avatar started speaking', true, SystemEventType.AVATAR_AUDIO_START);
          } else if (event === 'audio_end') {
            setIsAvatarSpeaking(false);
            addReceivedMessage(`event_${mid}`, '✅ Avatar finished speaking', true, SystemEventType.AVATAR_AUDIO_END);
          }
          // Log any other events for debugging
          else {
            addReceivedMessage(`event_${mid}`, `📋 Event: ${event}`, true);
          }
        } else if (type === 'command') {
          // Handle command acknowledgments
          const { cmd, code, msg } = pld;
          if (code !== undefined) {
            // This is a command acknowledgment
            const status = code === 1000 ? '✅' : '❌';
            const statusText = code === 1000 ? 'Success' : 'Failed';
            const systemType = cmd === 'interrupt' ? SystemEventType.INTERRUPT_ACK : SystemEventType.SET_PARAMS_ACK;
            addReceivedMessage(
              `cmd_ack_${mid}`,
              `${status} ${cmd}: ${statusText}${msg ? ` (${msg})` : ''}`,
              true,
              systemType,
            );
          } else {
            // This is a command being sent
            const { data } = pld;
            const dataStr = data ? ` with data: ${JSON.stringify(data)}` : '';
            const systemType = cmd === 'interrupt' ? SystemEventType.INTERRUPT : SystemEventType.SET_PARAMS;
            addReceivedMessage(`cmd_send_${mid}`, `📤 ${cmd}${dataStr}`, true, systemType);
          }
        }
      } catch (error) {
        console.error('Error handling stream message:', error);
        console.error('Message body:', body);
      }
    },
    [setIsAvatarSpeaking, addReceivedMessage],
  );

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
      // Add system message for user audio state change
      if (micEnabled) {
        addReceivedMessage(`mic_${Date.now()}`, '🔇 User microphone disabled', true, SystemEventType.MIC_END);
      } else {
        addReceivedMessage(`mic_${Date.now()}`, '🎤 User microphone enabled', true, SystemEventType.MIC_START);
      }
      return;
    }

    // Fallback implementation if toggleMic is not provided
    if (!micEnabled) {
      setMicEnabled(true);
      addReceivedMessage(`mic_${Date.now()}`, '🎤 User microphone enabled', true, SystemEventType.MIC_START);
    } else {
      setMicEnabled(false);
      addReceivedMessage(`mic_${Date.now()}`, '🔇 User microphone disabled', true, SystemEventType.MIC_END);
    }
  };

  const toggleCameraInternal = async () => {
    if (!connected) return;

    try {
      // Add system message for video state change
      if (cameraEnabled) {
        addReceivedMessage(`camera_${Date.now()}`, '📷 User camera disabled', true, SystemEventType.CAMERA_END);
      } else {
        addReceivedMessage(`camera_${Date.now()}`, '📹 User camera enabled', true, SystemEventType.CAMERA_START);
      }

      // Toggle the camera
      await toggleCamera();
    } catch (error) {
      console.error('Failed to toggle camera:', error);
    }
  };

  return (
    <div className="chat-window">
      <div className="chat-messages">
        {messages.map((message, index) => {
          const previousMessage = index > 0 ? messages[index - 1] : undefined;
          const showTimeSeparator = shouldShowTimeSeparator(message, previousMessage);
          const isFirstMessage = index === 0;

          return (
            <div key={message.id}>
              {(isFirstMessage || showTimeSeparator) && (
                <div className="time-separator">{formatTime(message.timestamp)}</div>
              )}
              <div
                className={`chat-message ${message.isSentByMe ? 'sent' : 'received'} ${message.isSystemMessage ? `system ${message.systemType || ''}` : ''}`}
              >
                {message.text}
              </div>
            </div>
          );
        })}
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
              onClick={() => {
                // Add system message for interrupt
                addReceivedMessage(
                  `interrupt_${Date.now()}`,
                  '🛑 User interrupted response',
                  true,
                  SystemEventType.INTERRUPT,
                );
                interruptResponse(client, (cmd) => {
                  console.log(`Interrupt command sent: ${cmd}`);
                });
              }}
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
