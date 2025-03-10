const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const { SpeechClient } = require('@google-cloud/speech');

// 1) Express & Socket.IO Setup
const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:8080", "http://127.0.0.1:8080"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// 2) Google Speech Client
// This reads credentials from the GOOGLE_APPLICATION_CREDENTIALS env variable
// or from the path we provide
const speechClient = new SpeechClient({
  keyFilename: path.join(__dirname, '../nlip-pwa-89f5620f7edd.json')
});

// 3) Multer for file uploads (in-memory)
const upload = multer({ storage: multer.memoryStorage() });

// Enable CORS for Express
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:8080');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// ---------------- BATCH API ENDPOINT ------------------

// POST /api/transcribe (Batch)
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded.' });
    }

    // Convert the uploaded buffer to base64
    const audioBytes = req.file.buffer.toString('base64');

    // Configure request
    const request = {
      audio: {
        content: audioBytes,
      },
      config: {
        encoding: 'WEBM_OPUS',      // or 'LINEAR16', etc., as appropriate
        sampleRateHertz: 48000,     // typical for webm/opus
        languageCode: 'en-US',
        enableAutomaticPunctuation: true
      },
    };

    const [response] = await speechClient.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    res.json({ transcription });
  } catch (err) {
    console.error('Error in batch transcription:', err);
    res.status(500).json({ error: err.toString() });
  }
});

// ---------------- REAL-TIME (STREAMING) SETUP ------------------

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  let recognizeStream = null;

  // Client triggers "startStream" to begin streaming to Google
  socket.on('startStream', (config) => {
    console.log('startStream received');
    // Create a new streamingRecognize request
    recognizeStream = speechClient
      .streamingRecognize({
        config: {
          encoding: 'WEBM_OPUS',    // or 'LINEAR16' if you plan raw PCM
          sampleRateHertz: 48000,
          languageCode: 'en-US',
          enableAutomaticPunctuation: true,
          ...config
        },
        interimResults: true, // get partial transcripts
      })
      .on('error', (err) => {
        console.error('Streaming error:', err);
        socket.emit('streamError', err.toString());
      })
      .on('data', (data) => {
        if (data.results && data.results[0]) {
          const transcript = data.results[0].alternatives[0].transcript;
          const isFinal = data.results[0].isFinal;
          // Send partial or final transcripts back to the client
          socket.emit('transcriptionData', { transcript, isFinal });
        }
      });
  });

  // "audioData" event - raw audio chunks from the client
  socket.on('audioData', (audioChunk) => {
    if (recognizeStream) {
      recognizeStream.write(audioChunk);
    }
  });

  // "stopStream" event - end the streaming
  socket.on('stopStream', () => {
    if (recognizeStream) {
      recognizeStream.end();
      recognizeStream = null;
    }
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (recognizeStream) {
      recognizeStream.end();
    }
  });
});

// ---------------- SERVE STATIC FILES (LIT APP) ------------------
app.use(express.static(path.join(__dirname, '../dist')));

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
}); 