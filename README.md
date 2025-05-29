# Quick Demo for Akool Streaming Avatar Demo in Web

# Streaming Avatar React Demo

A React-based demo application for integrating with Akool's Streaming Avatar service. This demo showcases real-time avatar streaming with voice interaction, network quality monitoring, and chat functionality.

## Features

- Real-time avatar streaming
- Voice interaction support
- Text-based chat interface
- Network quality monitoring
- Multiple language support
- Customizable avatar and voice selection
- Responsive design

## Prerequisites

- Node.js v22.11.0 or higher
- A valid Akool API token

## Setup

1. Clone the repository:

```bash
git clone https://github.com/AKOOL-Official/akool-streaming-avatar-react-demo
cd akool-streaming-avatar-react-demo
```

2. Install dependencies:

```bash
pnpm install
```

3. Start the development server:

```bash
pnpm dev
```

The application will be available at `http://localhost:5173/streaming/avatar`

## Building for Production

Build the application:

```bash
pnpm build:prod
```

The built application will be in the `dist` directory.

## Configuration

The application can be configured with the following parameters:

- OpenAPI Host
- API Token
- Avatar Selection
- Language Settings
- Voice Settings
- Session Duration

## Network Quality Monitoring

The application includes a comprehensive network quality monitoring system that displays:

- Video and audio statistics
- Network latency
- Packet loss rates
- Bitrate information
- Frame rates
- End-to-end delay metrics

## Browser Support

- Chrome
- Firefox
- Safari
- Edge

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request
