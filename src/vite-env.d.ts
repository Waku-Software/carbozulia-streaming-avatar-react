/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAPI_HOST: string;
  readonly VITE_OPENAPI_TOKEN: string;
  readonly VITE_MODE_TYPE: string;
  readonly VITE_AVATAR_ID: string;
  readonly VITE_AVATAR_VIDEO_URL: string;
  readonly VITE_VOICE_ID: string;
  readonly VITE_VOICE_URL: string;
  readonly VITE_LANGUAGE: string;
  readonly VITE_BACKGROUND_URL: string;
  readonly VITE_KNOWLEDGE_ID: string;
  readonly VITE_SESSION_DURATION: string;
  readonly VITE_NOISE_REDUCTION: string;
  readonly VITE_DEBUG_FEATURES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
