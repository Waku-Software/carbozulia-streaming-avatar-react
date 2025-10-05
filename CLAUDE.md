# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React-based demo application for Akool's Streaming Avatar service. It provides real-time voice and video interaction with AI avatars using Agora RTC for WebRTC communication and the Akool API for avatar session management.

## Commands

### Development
```bash
pnpm dev              # Start development server at http://localhost:5173/streaming/avatar
pnpm build            # Build for development
pnpm build:prod       # Build for production
pnpm preview          # Preview production build
```

### Testing
```bash
pnpm test             # Run tests with vitest
pnpm test:ui          # Run tests with UI
pnpm test:coverage    # Run tests with coverage
pnpm test:watch       # Run tests in watch mode
```

### Code Quality
```bash
pnpm lint             # Run ESLint (warns on unused variables with _ prefix ignored)
pnpm format           # Format code with Prettier
pnpm typecheck        # Run TypeScript type checking without emitting files
```

## Architecture

### Core Communication Flow

The application follows a specific flow for avatar streaming:

1. **Session Creation** (`apiService.ts`): Creates a session via `/api/open/v4/liveAvatar/session/create` which returns Agora credentials
2. **Channel Join** (`useStreaming.ts`): Uses credentials to join Agora RTC channel
3. **Stream Communication** (`agoraHelper.ts`): Sends/receives messages via Agora's data stream
4. **Avatar Control**: Uses stream messages with specific format (v2 protocol) to control avatar and send chat

### State Management

- **AgoraContext** (`contexts/AgoraContext.tsx`): Provides singleton Agora RTC client and avatar speaking state across the app
- **Custom Hooks** organize business logic:
  - `useStreaming`: Session lifecycle, channel joining/leaving, avatar parameter updates
  - `useMessageState`: Chat message handling, system events, and message formatting
  - `useAudioControls`: Microphone control, noise reduction (Agora AI denoiser extension)
  - `useVideoCamera`: Local camera video track management
  - `useNoiseReduction`: Audio processing pipeline with noise reduction

### Message Protocol

The app uses a v2 stream message protocol (defined in `agoraHelper.ts`):

```typescript
{
  v: 2,
  type: 'chat' | 'command',
  mid: string,  // message ID
  idx?: number, // chunk index for long messages
  fin?: boolean, // final chunk flag
  pld: {...}    // payload
}
```

**Important constraints:**
- Maximum encoded message size: 950 bytes
- Rate limit: 6000 bytes per second
- Long messages are automatically chunked and sent with delays

### API Service Layer

`ApiService` class (`apiService.ts`) handles all Akool API calls:
- Session management (create/close)
- Avatar/voice/language/knowledge list fetching
- Uses Bearer token authentication from `VITE_OPENAPI_TOKEN`

### Component Architecture

Components are organized by feature:
- **ConfigurationPanel**: Avatar/voice/language selection, session controls
- **VideoDisplay**: Displays remote avatar video and local camera feed
- **ChatInterface**: Message input, display, and media controls (mic/camera)
- **NetworkQuality**: Real-time RTC statistics display
- **AvatarSelector/VoiceSelector**: UI for selecting avatar/voice options

## Environment Variables

Required variables (see `.env.development.local`):
- `VITE_OPENAPI_HOST`: Akool API base URL (default: `https://openapi.akool.com`)
- `VITE_OPENAPI_TOKEN`: Authentication token from `/api/open/v3/getToken`
- `VITE_SERVER_BASE`: Base path for the app (default: `/streaming/avatar`)
- `VITE_AVATAR_ID`: Avatar ID (production: `BXGJbMNoOHzOBjJ1TUXxE`)
- `VITE_LANGUAGE`: Language code (production: `es` for Spanish)
- `VITE_KNOWLEDGE_ID`: Knowledge base ID for avatar context
- `VITE_VOICE_ID`: Voice ID (production: `TX3LPaxmHKxFdv7VOQHJ` for "Intellectual Youth")
- `VITE_SESSION_DURATION`: Session duration in minutes (production: `10`)
- `VITE_AVATAR_VIDEO_URL`: Placeholder video URL for avatar (optional)
- `VITE_NOISE_REDUCTION`: Enable AI noise reduction for microphone (production: `true`)

Optional:
- `VITE_DEBUG_FEATURES`: Set to `true` to enable debug buttons (audio dump)

Production hardcoded values:
- `modeType`: Always set to `2` (Dialogue mode) in production

UI Theme:
- Dark theme enabled by default (background: `#18191a`, foreground: `#e4e6eb`)
- Content is centered on the page

## Important Technical Details

### Agora Client Management

- The Agora client is created once in `AgoraContext` using `useMemo`
- Client is configured with `mode: 'rtc'` and `codec: 'vp8'`
- Always check `isClientReady()` before sending stream messages (checks `connectionState === 'CONNECTED'` and `uid !== undefined`)
- Event listeners must be properly cleaned up to avoid memory leaks

### Audio Features

- **Noise Reduction**: Uses `agora-extension-ai-denoiser` extension
- When enabled, creates a processing pipeline: `localMicrophoneTrack → processor → processedTrack → publish`
- Audio dump feature (debug only) captures PCM data for analysis

### Message Handling

- Chat messages support chunking for content > 950 bytes
- System messages (mic start/end, camera start/end, etc.) are tracked separately
- Old system messages are auto-cleaned (keeps last 10) to prevent memory bloat
- Messages use `MessageSender` and `MessageType` enums for categorization

### Session Lifecycle

1. `startStreaming()`: Creates API session → joins Agora channel → joins chat
2. Avatar parameters can be updated mid-session via `setAvatarParams()`
3. `closeStreaming()`: Leaves chat → leaves channel → closes API session
4. All local tracks (audio/video) must be stopped and closed before unpublishing

## Testing

- Uses Vitest with React Testing Library
- Tests configured in `vitest.config.ts`
- Pre-commit hooks run prettier and eslint via husky + lint-staged

## Build Configuration

- **Vite** with React SWC plugin for fast refresh
- Base path set via `VITE_SERVER_BASE` environment variable
- TypeScript strict mode enabled
- Development server binds to `0.0.0.0` for network access

## Token Management

**Production**: Never expose the `VITE_OPENAPI_TOKEN` in client code. All API requests must be routed through a backend server that securely manages tokens.

**Development**: Token is valid for >1 year. Obtain via POST to `/api/open/v3/getToken` with `clientId` and `clientSecret`.
