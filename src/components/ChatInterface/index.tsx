import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RTCClient, interruptResponse } from '../../agoraHelper';
import {
  useMessageState,
  SystemEventType,
  UserTriggeredEventType,
  MessageSender,
  MessageType,
} from '../../hooks/useMessageState';
import { useAgora } from '../../contexts/AgoraContext';
import './styles.css';
import wakuLogo from '../../assets/waku-logo.png';

interface ChatInterfaceProps {
  client: RTCClient;
  connected: boolean;
  micEnabled: boolean;
  setMicEnabled: (enabled: boolean) => void;
  toggleMic?: () => Promise<void>;
  onSystemEvent?: (type: UserTriggeredEventType, message: string) => void;
  onSystemMessageCallback?: (
    callback: (messageId: string, text: string, systemType: string, metadata?: Record<string, unknown>) => void,
  ) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  client,
  connected,
  micEnabled,
  setMicEnabled,
  toggleMic,
  onSystemMessageCallback,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { setIsAvatarSpeaking } = useAgora();

  // Add state for resizable height
  const [chatHeight, setChatHeight] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(0);

  // Add state for Waku modal
  const [showWakuModal, setShowWakuModal] = useState(false);

  const {
    messages,
    inputMessage,
    setInputMessage,
    sendMessage,
    addChatMessage,
    addSystemMessage,
    clearMessages,
    formatTime,
    shouldShowTimeSeparator,
  } = useMessageState({
    client,
    connected,
  });

  // Handle mouse down on resize handle
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      console.log('Resize handle clicked!', e.clientY);
      e.preventDefault();
      setIsResizing(true);
      setStartY(e.clientY);
      setStartHeight(chatHeight);
    },
    [chatHeight],
  );

  // Handle mouse move for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const deltaY = startY - e.clientY;
      const maxHeight = window.innerHeight - 40; // Leave some margin from top
      const newHeight = Math.max(200, Math.min(maxHeight, startHeight + deltaY));
      console.log('Resizing:', { deltaY, newHeight, maxHeight, startY: e.clientY });
      setChatHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, startY, startHeight]);

  // Handle window resize to adjust max height
  useEffect(() => {
    const handleWindowResize = () => {
      const maxHeight = window.innerHeight - 40;
      if (chatHeight > maxHeight) {
        setChatHeight(maxHeight);
      }
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [chatHeight]);

  const handleStreamMessage = useCallback(
    (_: number, body: Uint8Array) => {
      try {
        const msg = new TextDecoder().decode(body);
        const { v, type, mid, pld } = JSON.parse(msg);
        if (v !== 2) {
          return;
        }

        if (type === 'chat') {
          const { text, from } = pld;
          const sender = from === 'user' ? MessageSender.USER : MessageSender.AVATAR;
          addChatMessage(`${type}_${mid}`, text, sender);
        } else if (type === 'event') {
          const { event } = pld;
          if (event === 'audio_start') {
            setIsAvatarSpeaking(true);
            console.log('🎤 Avatar started speaking');
          } else if (event === 'audio_end') {
            setIsAvatarSpeaking(false);
            console.log('✅ Avatar finished speaking');
          }
          // Log any other events for debugging
          else {
            console.log(`📋 Event: ${event}`, pld);
          }
        } else if (type === 'command') {
          // Handle command acknowledgments
          const { cmd, code, msg } = pld;
          if (code !== undefined) {
            // This is a command acknowledgment
            const status = code === 1000 ? '✅' : '❌';
            const statusText = code === 1000 ? 'Success' : 'Failed';

            // Only log set-params success to console, don't show in chat
            if (cmd === 'set-params' && code === 1000) {
              console.log(`✅ set-params: Success${msg ? ` (${msg})` : ''}`, pld);
            } else {
              // Show other command responses (errors or interrupt commands)
              const systemType = cmd === 'interrupt' ? SystemEventType.INTERRUPT_ACK : SystemEventType.SET_PARAMS_ACK;
              addSystemMessage(
                `cmd_ack_${mid}`,
                `${status} ${cmd}: ${statusText}${msg ? ` (${msg})` : ''}`,
                systemType,
              );
            }
          } else {
            // Command being sent - only log to console for set-params
            const { data } = pld;
            if (cmd === 'set-params') {
              console.log('📤 set-params command sent:', data);
            } else {
              // Show other commands in chat (like interrupt)
              const dataStr = data ? ` with data: ${JSON.stringify(data)}` : '';
              const systemType = cmd === 'interrupt' ? SystemEventType.INTERRUPT : SystemEventType.SET_PARAMS;
              addSystemMessage(`cmd_send_${mid}`, `📤 ${cmd}${dataStr}`, systemType);
            }
          }
        }
      } catch (error) {
        console.error('Error handling stream message:', error);
        console.error('Message body:', body);
      }
    },
    [setIsAvatarSpeaking, addChatMessage, addSystemMessage],
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

  // Set up system message callback
  useEffect(() => {
    if (onSystemMessageCallback) {
      onSystemMessageCallback((messageId, text, systemType, metadata) => {
        addSystemMessage(messageId, text, systemType as SystemEventType, metadata);
      });
    }
  }, [onSystemMessageCallback, addSystemMessage]);

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
      // Log user audio state change
      if (micEnabled) {
        console.log('🔇 User microphone disabled');
      } else {
        console.log('🎤 User microphone enabled');
      }
      return;
    }

    // Fallback implementation if toggleMic is not provided
    if (!micEnabled) {
      setMicEnabled(true);
      console.log('🎤 User microphone enabled');
    } else {
      setMicEnabled(false);
      console.log('🔇 User microphone disabled');
    }
  };

  return (
    <div className={`chat-window ${isResizing ? 'resizing' : ''}`} style={{ height: `${chatHeight}px` }}>
      <div
        className="resize-handle"
        onMouseDown={handleMouseDown}
        title={`Drag to resize chat window (current height: ${chatHeight}px)`}
      >
        <div className="resize-indicator"></div>
        <div className="resize-dots">
          <span>•</span>
          <span>•</span>
          <span>•</span>
        </div>
        <div className="resize-text">↕ Drag to resize</div>
      </div>
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
                className={`chat-message ${message.sender === MessageSender.USER ? 'sent' : 'received'} ${message.messageType === MessageType.SYSTEM ? `system ${message.systemType || ''}` : ''}`}
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
          title={micEnabled ? 'Deshabilitar micrófono' : 'Habilitar micrófono'}
        >
          <span className="material-icons">{micEnabled ? 'mic' : 'mic_off'}</span>
        </button>
        {!micEnabled && (
          <>
            <input
              type="text"
              placeholder={'Escribe un mensaje...'}
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
              title="Enviar mensaje"
            >
              <span className="material-icons">send</span>
            </button>
            <button
              onClick={() => {
                // Log interrupt action
                console.log('🛑 User interrupted response');
                interruptResponse(client, (cmd) => {
                  console.log(`Interrupt command sent: ${cmd}`);
                });
              }}
              disabled={!connected}
              className={`icon-button ${!connected ? 'disabled' : ''}`}
              title="Interrumpir respuesta"
            >
              <span className="material-icons">stop</span>
            </button>
          </>
        )}
      </div>
      <div className="chat-footer">
        <p>
          Desarrollado por Smartdev y{' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setShowWakuModal(true);
            }}
            className="waku-link"
          >
            Waku Software
          </a>
        </p>
      </div>

      {/* Waku Modal */}
      {showWakuModal && (
        <div className="modal-overlay" onClick={() => setShowWakuModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowWakuModal(false)}>
              ×
            </button>
            <img src={wakuLogo} alt="Waku Software" className="modal-logo" />
            <p className="modal-text">Puedes conocernos visitando www.wakusoftware.com</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
