import { useState, useCallback, useEffect } from 'react';
import { RTCClient } from '../agoraHelper';
import { sendMessageToAvatar } from '../agoraHelper';

export interface Message {
  id: string;
  text: string;
  isSentByMe: boolean;
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
  addReceivedMessage: (messageId: string, text: string) => void;
}

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

  const addReceivedMessage = useCallback((messageId: string, text: string) => {
    setMessages((prev) => {
      // Check if message already exists
      const existingMessageIndex = prev.findIndex((msg) => msg.id === messageId);
      if (existingMessageIndex !== -1) {
        // Update existing message
        const newMessages = [...prev];
        newMessages[existingMessageIndex] = {
          ...newMessages[existingMessageIndex],
          text: newMessages[existingMessageIndex].text + text,
        };
        return newMessages;
      }
      // Add new message
      return [...prev, { id: messageId, text, isSentByMe: false }];
    });
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setInputMessage('');
  }, []);

  return {
    messages,
    inputMessage,
    setInputMessage,
    sendMessage,
    clearMessages,
    addReceivedMessage,
  };
};
