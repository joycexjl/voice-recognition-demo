# Voice Recognition Functionality Documentation

## Overview

This document provides detailed information about the voice recognition functionality implemented in the Speech-to-Text Transcription demo PWA. The application provides both batch processing of audio files and real-time streaming transcription capabilities.

## Table of Contents

1. [Architecture](#architecture)
2. [Batch Transcription](#batch-transcription)
3. [Real-time Streaming Transcription](#real-time-streaming-transcription)
4. [Technical Implementation](#technical-implementation)
5. [Setup and Configuration](#setup-and-configuration)
6. [Troubleshooting](#troubleshooting)

## Architecture

The voice recognition system consists of the following components:

- **Frontend**: A web application built with Lit Element that provides the user interface for both batch and streaming transcription.
- **Backend**: A Node.js server that handles API requests and WebSocket connections.
- **Google Speech-to-Text API**: The cloud service that performs the actual speech recognition.

### Communication Flow

1. **Batch Processing**:

   - User uploads an audio file through the frontend
   - File is sent to the backend via HTTP POST request
   - Backend forwards the audio to Google's Speech-to-Text API
   - Results are returned to the frontend

2. **Real-time Streaming**:
   - User initiates recording in the browser
   - Audio chunks are sent to the backend via WebSocket
   - Backend forwards audio chunks to Google's Speech-to-Text API in real-time
   - Transcription results are streamed back to the frontend as they become available

## Batch Transcription

The batch transcription feature allows users to upload pre-recorded audio files for transcription.

### Features

- Supports various audio formats (WAV, MP3, FLAC, etc.)
- Displays file information (name and size)
- Shows transcription results in a scrollable container
- Provides error handling and troubleshooting tips

### Usage

1. Navigate to the "Batch Transcription" tab
2. Click "Choose File" to select an audio file
3. Click "Upload & Transcribe"
4. Wait for the transcription to complete
5. View the transcription results

### Technical Details

- Uses the HTML5 File API to handle file selection
- Sends the file to the server using `FormData` and `fetch` API
- Processes the file on the server using Multer for file handling
- Calls Google's Speech-to-Text API's `recognize` method for batch processing

## Real-time Streaming Transcription

The real-time streaming feature allows users to transcribe speech as they speak into their microphone.

### Features

- Real-time transcription with interim results
- Visual recording indicator
- Connection status monitoring
- Error handling with retry capability

### Usage

1. Navigate to the "Real-time Streaming" tab
2. Click "Start Recording" to begin capturing audio
3. Speak into your microphone
4. View transcription results in real-time
5. Click "Stop Recording" when finished

### Technical Details

- Uses the MediaRecorder API to capture audio from the user's microphone
- Configures audio with echo cancellation, noise suppression, and auto gain control
- Streams audio in WebM/Opus format (with fallback to default codec if not supported)
- Sends audio chunks to the server via Socket.IO
- Uses Google's Speech-to-Text API's `streamingRecognize` method for real-time processing
- Receives and displays both interim and final transcription results

## Technical Implementation

### Frontend Components

1. **BatchTranscribe Component** (`src/components/batch-transcribe.ts`)

   - Handles file selection and upload
   - Displays transcription results
   - Manages loading states and error handling

2. **StreamingTranscribe Component** (`src/components/streaming-transcribe.ts`)

   - Manages WebSocket connection to the server
   - Controls the MediaRecorder for audio capture
   - Displays real-time transcription results
   - Handles connection errors and retries

3. **Socket Client Helper** (`src/helpers/socket-client.ts`)
   - Provides a wrapper for Socket.IO client
   - Loads the Socket.IO library from CDN
   - Configures connection parameters

### Backend Implementation

1. **Express Server** (`server/index.js`)

   - Handles HTTP requests for batch transcription
   - Configures CORS for cross-origin requests
   - Serves the frontend application in production

2. **Socket.IO Server** (`server/index.js`)

   - Manages WebSocket connections for streaming
   - Handles audio data streaming to Google's API
   - Forwards transcription results back to clients

3. **Google Speech-to-Text Integration**
   - Configures the Speech-to-Text client with credentials
   - Sets up appropriate recognition configurations for both batch and streaming modes
   - Processes audio data and returns transcription results

## Setup and Configuration

### Prerequisites

- Node.js (v14 or later)
- Google Cloud Platform account with Speech-to-Text API enabled
- Service account credentials (JSON key file)

### Configuration Steps

1. **Google Cloud Setup**

   - Create a project in Google Cloud Platform
   - Enable the Speech-to-Text API
   - Create a service account and download the JSON key file
   - Place the key file in the root directory of the project (`nlip-pwa-89f5620f7edd.json`)

2. **Application Setup**
   - Install dependencies: `npm install`
   - Start the development servers: `npm run dev`
   - Access the application at http://localhost:8080

### Environment Configuration

The application uses different configuration files for different environments:

- `config.ts` - Base configuration
- `config.staging.ts` - Staging environment configuration
- `config.production.ts` - Production environment configuration

## Troubleshooting

### Common Issues

1. **Microphone Access Denied**

   - Ensure your browser has permission to access the microphone
   - Check browser settings to allow microphone access for the application

2. **Connection Errors**

   - Verify that both frontend and backend servers are running
   - Check that the backend server is accessible at http://localhost:3000
   - Ensure proper network connectivity

3. **Transcription Quality Issues**

   - Speak clearly and at a moderate pace
   - Reduce background noise
   - Use a good quality microphone
   - Try adjusting your distance from the microphone

4. **File Upload Problems**
   - Ensure the file is in a supported format
   - Check that the file size is reasonable (less than 10MB recommended)
   - Verify that the file contains speech content

### Debugging Tips

1. **Check Browser Console**

   - Open browser developer tools (F12)
   - Look for errors in the Console tab

2. **Server Logs**

   - Monitor the Node.js server console for error messages
   - Look for connection issues or API errors

3. **Network Monitoring**

   - Use the Network tab in browser developer tools
   - Check for failed requests or WebSocket connection issues

4. **Google API Quotas**
   - Verify that you haven't exceeded Google Speech-to-Text API quotas
   - Check the Google Cloud Console for quota information

## Limitations

1. **Browser Compatibility**

   - The MediaRecorder API may not be supported in all browsers
   - WebM/Opus codec support varies across browsers

2. **Network Requirements**

   - Real-time streaming requires a stable internet connection
   - High latency can affect the responsiveness of transcription

3. **API Limitations**

   - Google Speech-to-Text API has usage quotas and billing implications
   - Some advanced features may require specific API configuration

4. **Language Support**
   - Currently configured for English (en-US)
   - Supporting additional languages requires configuration changes
