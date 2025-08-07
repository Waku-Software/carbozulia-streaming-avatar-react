import { useState, useCallback, useEffect } from 'react';
import { RTCClient } from '../agoraHelper';
import { sendMessageToAvatar } from '../agoraHelper';

// System event types enum
export enum SystemEventType {
  AVATAR_AUDIO_START = 'avatar_audio_start',
  AVATAR_AUDIO_END = 'avatar_audio_end',
  MIC_START = 'mic_start',
  MIC_END = 'mic_end',
  CAMERA_START = 'camera_start',
  CAMERA_END = 'camera_end',
  SET_PARAMS = 'set_params',
  SET_PARAMS_ACK = 'set_params_ack',
  INTERRUPT = 'interrupt',
  INTERRUPT_ACK = 'interrupt_ack',
}

// Type for user-triggered system events
export type UserTriggeredEventType =
  | SystemEventType.MIC_START
  | SystemEventType.MIC_END
  | SystemEventType.CAMERA_START
  | SystemEventType.CAMERA_END;

export interface Message {
  id: string;
  text: string;
  isSentByMe: boolean;
  isSystemMessage?: boolean;
  systemType?: SystemEventType;
  timestamp: number;
  // Additional data for tooltips and other features
  metadata?: {
    fullParams?: Record<string, unknown>; // For set-params messages
    [key: string]: unknown;
  };
}

interface UseMessageStateProps {
  client: RTCClient;
  connected: boolean;
  onStreamMessage?: (uid: number, body: Uint8Array) => void;
}

interface UseMessageStateReturn {
  messages: Message[];
  inputMessage: string;
  setInputMessage: (message: string) => void;
  sendMessage: () => Promise<void>;
  clearMessages: () => void;
  addReceivedMessage: (
    messageId: string,
    text: string,
    isSystemMessage?: boolean,
    systemType?: SystemEventType,
    metadata?: Message['metadata'],
  ) => void;
  cleanupOldSystemMessages: () => void;
  formatTime: (timestamp: number) => string;
  shouldShowTimeSeparator: (currentMessage: Message, previousMessage: Message | undefined) => boolean;
}

// Utility function to format timestamp as HH:mm
const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

// Utility function to check if time separator should be shown
const shouldShowTimeSeparator = (currentMessage: Message, previousMessage: Message | undefined): boolean => {
  if (!previousMessage) return false;
  const timeDiff = currentMessage.timestamp - previousMessage.timestamp;

  // Show separator if gap is more than 30 seconds
  if (timeDiff > 30000) return true;

  // Show separator every 5 minutes (300000 ms) regardless of gap
  const currentMinute = Math.floor(currentMessage.timestamp / 300000);
  const previousMinute = Math.floor(previousMessage.timestamp / 300000);

  return currentMinute > previousMinute;
};

export const useMessageState = ({
  client,
  connected,
  onStreamMessage,
}: UseMessageStateProps): UseMessageStateReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Set up stream message listener
  useEffect(() => {
    if (connected && onStreamMessage) {
      // Store the handler reference so we can remove only this specific listener
      const messageHandler = onStreamMessage;
      client.on('stream-message', messageHandler);
      return () => {
        // Remove only this specific listener, not all listeners
        client.off('stream-message', messageHandler);
      };
    }
  }, [client, connected, onStreamMessage]);

  const sendMessage = useCallback(async () => {
    if (!inputMessage.trim() || !connected || sending) return;

    setSending(true);
    const messageId = Date.now().toString();

    // Add message to local state immediately
    const newMessage: Message = {
      id: messageId,
      text: inputMessage,
      isSentByMe: true,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputMessage('');

    try {
      await sendMessageToAvatar(client, messageId, inputMessage);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Optionally remove the message from state if sending failed
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    } finally {
      setSending(false);
    }
  }, [client, connected, inputMessage, sending]);

  const addReceivedMessage = useCallback(
    (
      messageId: string,
      text: string,
      isSystemMessage: boolean = false,
      systemType?: SystemEventType,
      metadata?: Message['metadata'],
    ) => {
      setMessages((prev) => {
        const currentTime = Date.now();
        // For system messages, always create a new message to avoid concatenation
        if (isSystemMessage) {
          return [
            ...prev,
            {
              id: `${messageId}_${currentTime}`,
              text,
              isSentByMe: false,
              isSystemMessage,
              systemType,
              timestamp: currentTime,
              metadata,
            },
          ];
        }

        // For regular messages, check if message already exists
        const existingMessageIndex = prev.findIndex((msg) => msg.id === messageId);
        if (existingMessageIndex !== -1) {
          // Update existing message
          const newMessages = [...prev];
          newMessages[existingMessageIndex] = {
            ...newMessages[existingMessageIndex],
            text: newMessages[existingMessageIndex].text + text,
            metadata,
          };
          return newMessages;
        }
        // Add new message
        return [
          ...prev,
          {
            id: messageId,
            text,
            isSentByMe: false,
            isSystemMessage,
            systemType,
            timestamp: currentTime,
            metadata,
          },
        ];
      });
    },
    [],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setInputMessage('');
  }, []);

  // Clean up old system messages to keep chat history manageable
  const cleanupOldSystemMessages = useCallback(() => {
    setMessages((prev) => {
      // Keep only the last 10 system messages and all regular messages
      const systemMessages = prev.filter((msg) => msg.isSystemMessage);
      const regularMessages = prev.filter((msg) => !msg.isSystemMessage);

      // Keep the last 10 system messages
      const recentSystemMessages = systemMessages.slice(-10);

      return [...regularMessages, ...recentSystemMessages].sort((a, b) => {
        // Sort by the order they appeared in the original array
        const aIndex = prev.findIndex((msg) => msg.id === a.id);
        const bIndex = prev.findIndex((msg) => msg.id === b.id);
        return aIndex - bIndex;
      });
    });
  }, []);

  // Auto-cleanup system messages when there are too many
  useEffect(() => {
    if (messages.filter((msg) => msg.isSystemMessage).length > 15) {
      cleanupOldSystemMessages();
    }
  }, [messages, cleanupOldSystemMessages]);

  return {
    messages,
    inputMessage,
    setInputMessage,
    sendMessage,
    clearMessages,
    addReceivedMessage,
    cleanupOldSystemMessages,
    formatTime,
    shouldShowTimeSeparator,
  };
};
