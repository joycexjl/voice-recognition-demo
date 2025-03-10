# Speech-to-Text Transcription App

This application provides speech-to-text transcription capabilities using Google's Speech-to-Text API. It supports both batch processing of audio files and real-time streaming transcription.

## Features

- **Batch Transcription**: Upload pre-recorded audio files for transcription
- **Real-time Streaming**: Transcribe speech in real-time using your microphone
- **Google Speech API**: Powered by Google's advanced speech recognition technology

## Prerequisites

- Node.js (v14 or later)
- Google Cloud Platform account with Speech-to-Text API enabled
- Service account credentials (JSON key file)

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Make sure your Google Cloud credentials file (`nlip-pwa-89f5620f7edd.json`) is in the root directory

## Running the Application

### Development Mode

To run both the frontend and backend servers simultaneously:

```
npm run dev
```

This will start:

- The frontend development server at http://localhost:8080
- The backend Node.js server at http://localhost:3000

### Production Build

To build the application for production:

```
npm run build
```

Then start the server:

```
npm run start:server
```

The application will be available at http://localhost:3000

## Usage

1. Navigate to the home page
2. Choose between "Batch Transcription" or "Real-time Streaming" using the tabs

### Batch Transcription

1. Click "Choose File" to select an audio file
2. Click "Upload & Transcribe"
3. Wait for the transcription to complete
4. View the transcription results

Supported audio formats include WAV, MP3, FLAC, and others.

### Real-time Streaming

1. Click "Start Recording" to begin capturing audio from your microphone
2. Speak clearly into your microphone
3. View real-time transcription results as you speak
4. Click "Stop Recording" when finished

## Deployment

For production deployment:

1. Build the application: `npm run build`
2. Set the environment variable for Google credentials:
   ```
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/nlip-pwa-89f5620f7edd.json"
   ```
3. Start the server: `npm run start:server`

## Technologies Used

- **Frontend**: Lit, TypeScript, WebSockets (Socket.IO)
- **Backend**: Node.js, Express, Google Cloud Speech-to-Text API
- **Audio Processing**: MediaRecorder API, WebM/Opus encoding