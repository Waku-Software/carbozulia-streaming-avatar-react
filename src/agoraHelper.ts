import { IAgoraRTCClient } from 'agora-rtc-sdk-ng';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function log(...args: any[]) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}]`, ...args);
}

export interface RTCClient extends IAgoraRTCClient {
  sendStreamMessage(msg: Uint8Array | string, flag: boolean): Promise<void>;
}

type Metadata = {
  vid?: string; // voiceId
  vurl?: string; // voiceUrl
  lang?: string; // language
  mode?: number; // modeType
  bgurl?: string; // backgroundUrl
  vparams?: string; // voice params
};

export type CommandPayload = {
  cmd: string;
  data?: Metadata;
};

export type CommandResponsePayload = {
  cmd: string;
  code: number;
  msg?: string;
};

export type ChatPayload = {
  text: string;
  meta?: Metadata;
};

export type ChatResponsePayload = {
  text: string;
  from: 'bot' | 'user';
};

export type EventPayload = {
  event: 'camera_open' | 'camera_close';
};

export type StreamMessage = {
  v: number;
  type: string;
  mid: string;
  idx?: number;
  fin?: boolean;
  pld: CommandPayload | ChatPayload | EventPayload;
};

export async function setAvatarParams(client: RTCClient, meta: Metadata) {
  // Remove empty or undefined values from meta
  const cleanedMeta = Object.fromEntries(Object.entries(meta).filter(([_, value]) => !!value));

  const message: StreamMessage = {
    v: 2,
    type: 'command',
    mid: `msg-${Date.now()}`,
    pld: {
      cmd: 'set-params',
      data: cleanedMeta,
    },
  };
  const jsondata = JSON.stringify(message);
  log(`setAvatarParams, size=${jsondata.length}, data=${jsondata}`);
  return client.sendStreamMessage(jsondata, false);
}

export async function interruptResponse(client: RTCClient) {
  const message: StreamMessage = {
    v: 2,
    type: 'command',
    mid: `msg-${Date.now()}`,
    pld: {
      cmd: 'interrupt',
    },
  };
  const jsondata = JSON.stringify(message);
  log(`interuptResponse, size=${jsondata.length}, data=${jsondata}`);
  return client.sendStreamMessage(jsondata, false);
}

export async function sendMessageToAvatar(client: RTCClient, messageId: string, content: string) {
  // Move constants to top level for better configuration
  const MAX_ENCODED_SIZE = 950;
  const BYTES_PER_SECOND = 6000;

  // Improved message encoder with proper typing
  const encodeMessage = (text: string, idx: number, fin: boolean): Uint8Array => {
    const message: StreamMessage = {
      v: 2,
      type: 'chat',
      mid: messageId,
      idx,
      fin,
      pld: {
        text,
      },
    };
    return new TextEncoder().encode(JSON.stringify(message));
  };

  // Validate inputs
  if (!content) {
    throw new Error('Content cannot be empty');
  }

  // Calculate maximum content length
  const baseEncoded = encodeMessage('', 0, false);
  const maxQuestionLength = Math.floor((MAX_ENCODED_SIZE - baseEncoded.length) / 4);

  // Split message into chunks
  const chunks: string[] = [];
  let remainingMessage = content;
  let chunkIndex = 0;

  while (remainingMessage.length > 0) {
    let chunk = remainingMessage.slice(0, maxQuestionLength);
    let encoded = encodeMessage(chunk, chunkIndex, false);

    // Binary search for optimal chunk size if needed
    while (encoded.length > MAX_ENCODED_SIZE && chunk.length > 1) {
      chunk = chunk.slice(0, Math.ceil(chunk.length / 2));
      encoded = encodeMessage(chunk, chunkIndex, false);
    }

    if (encoded.length > MAX_ENCODED_SIZE) {
      throw new Error('Message encoding failed: content too large for chunking');
    }

    chunks.push(chunk);
    remainingMessage = remainingMessage.slice(chunk.length);
    chunkIndex++;
  }

  log(`Splitting message into ${chunks.length} chunks`);

  // Send chunks with rate limiting
  for (let i = 0; i < chunks.length; i++) {
    const isLastChunk = i === chunks.length - 1;
    const encodedChunk = encodeMessage(chunks[i], i, isLastChunk);
    const chunkSize = encodedChunk.length;

    const minimumTimeMs = Math.ceil((1000 * chunkSize) / BYTES_PER_SECOND);
    const startTime = Date.now();

    log(`Sending chunk ${i + 1}/${chunks.length}, size=${chunkSize} bytes`);

    try {
      await client.sendStreamMessage(encodedChunk, false);
    } catch (error: unknown) {
      throw new Error(`Failed to send chunk ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    if (!isLastChunk) {
      const elapsedMs = Date.now() - startTime;
      const remainingDelay = Math.max(0, minimumTimeMs - elapsedMs);
      if (remainingDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingDelay));
      }
    }
  }
}

export async function sendCameraEvent(client: RTCClient, event: 'camera_open' | 'camera_close') {
  const messageId = `msg-${Date.now()}`;
  
  const message: StreamMessage = {
    v: 2,
    type: 'event',
    mid: messageId,
    pld: {
      event,
    },
  };

  const jsondata = new TextEncoder().encode(JSON.stringify(message));
  
  log(`Sending camera event: ${event}`);
  
  try {
    await client.sendStreamMessage(jsondata, false);
    log(`Camera event sent successfully: ${event}`);
  } catch (error) {
    console.error(`Failed to send camera event: ${event}`, error);
  }
}
