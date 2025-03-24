import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { createSocketClient, SocketClient } from '../helpers/socket-client.js';

interface Transcript {
  transcript: string;
  isFinal: boolean;
}

@customElement('streaming-transcribe')
export class StreamingTranscribe extends LitElement {
  static styles = css`
    :host {
      display: block;
      max-width: 800px;
      margin: 0 auto;
      padding: 16px;
    }

    .container {
      padding: 20px;
      border-radius: 8px;
      background-color: #f5f5f5;
      box-shadow: 0 2px 4px rgb(0 0 0 / 10%);
    }

    h2 {
      margin-top: 0;
      color: #333;
    }

    .controls {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }

    button {
      padding: 10px 16px;
      border: none;
      border-radius: 4px;
      background-color: #4285f4;
      color: white;
      font-weight: bold;
      cursor: pointer;
      transition: background-color 0.3s;
    }

    button:hover {
      background-color: #3367d6;
    }

    button:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }

    button.stop {
      background-color: #ea4335;
    }

    button.stop:hover {
      background-color: #d33426;
    }

    .transcripts {
      overflow-y: auto;
      max-height: 400px;
      margin-top: 20px;
      padding: 16px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background-color: white;
    }

    .transcript-item {
      margin-bottom: 10px;
      padding: 8px;
      border-radius: 4px;
    }

    .transcript-item.final {
      background-color: #e8f0fe;
    }

    .transcript-item.partial {
      border-left: 3px solid #4285f4;
      background-color: #f8f9fa;
      font-style: italic;
      animation: fade-in 0.3s ease-in-out;
    }

    @keyframes fade-in {
      from {
        opacity: 0.7;
        transform: translateY(2px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .transcript-item.partial strong {
      color: #4285f4;
    }

    .status {
      margin-top: 10px;
      color: #666;
      font-size: 14px;
    }

    .recording {
      display: flex;
      align-items: center;
      color: #ea4335;
      font-weight: bold;
    }

    .recording-indicator {
      width: 12px;
      height: 12px;
      margin-right: 8px;
      border-radius: 50%;
      background-color: #ea4335;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0% {
        opacity: 1;
      }
      50% {
        opacity: 0.4;
      }
      100% {
        opacity: 1;
      }
    }

    .error {
      margin-top: 10px;
      padding: 10px;
      border: 1px solid #ffcdd2;
      border-radius: 4px;
      background-color: #ffebee;
      color: #ea4335;
    }

    .troubleshooting {
      margin-top: 10px;
      padding: 10px;
      border: 1px solid #c8e6c9;
      border-radius: 4px;
      background-color: #e8f5e9;
    }

    .troubleshooting h3 {
      margin-top: 0;
      font-size: 16px;
    }

    .troubleshooting ul {
      margin: 0;
      padding-left: 20px;
    }
  `;

  @state()
  private socket: SocketClient | null = null;

  @state()
  private mediaRecorder: MediaRecorder | null = null;

  @state()
  private isRecording = false;

  @state()
  private transcripts: Transcript[] = [];

  @state()
  private currentPartial = '';

  @state()
  private error = '';

  @state()
  private isConnected = false;

  @state()
  private isConnecting = false;

  @state()
  private connectionAttempts = 0;

  @state()
  private showTroubleshooting = false;

  render() {
    return html`
      <div class="container">
        <h2>Streaming Transcription</h2>

        <div class="controls">
          <button
            @click=${this._startRecording}
            ?disabled=${this.isRecording ||
            !this.isConnected ||
            this.isConnecting}
          >
            Start Recording
          </button>
          <button
            class="stop"
            @click=${this._stopRecording}
            ?disabled=${!this.isRecording}
          >
            Stop Recording
          </button>
          ${this.error
            ? html`<button
                @click=${this._retryConnection}
                ?disabled=${this.isConnecting}
              >
                Retry Connection
              </button>`
            : ''}
        </div>

        ${this.isRecording
          ? html`<div class="recording">
              <div class="recording-indicator"></div>
              Recording...
            </div>`
          : ''}
        ${this.error
          ? html`
              <div class="error">
                <strong>Error:</strong> ${this.error}
                <button
                  @click=${() =>
                    (this.showTroubleshooting = !this.showTroubleshooting)}
                >
                  ${this.showTroubleshooting ? 'Hide' : 'Show'} Troubleshooting
                  Tips
                </button>
              </div>
              ${this.showTroubleshooting
                ? html`
                    <div class="troubleshooting">
                      <h3>Troubleshooting Tips:</h3>
                      <ul>
                        <li>
                          Make sure the server is running at
                          http://localhost:3000
                        </li>
                        <li>Check if your browser allows microphone access</li>
                        <li>Try refreshing the page</li>
                        <li>
                          Check if your firewall is blocking WebSocket
                          connections
                        </li>
                        <li>Try using a different browser</li>
                      </ul>
                    </div>
                  `
                : ''}
            `
          : ''}
        ${this.isConnecting
          ? html`<div class="status">
              Connecting to server (attempt ${this.connectionAttempts})...
            </div>`
          : !this.isConnected && !this.error
          ? html`<div class="status">Connecting to server...</div>`
          : ''}

        <div class="transcripts">
          ${this.transcripts.length === 0 && !this.currentPartial
            ? html`<div class="status">
                Speak after clicking "Start Recording"
              </div>`
            : html`
                ${this.transcripts.map(
                  (t) => html`
                    <div class="transcript-item final">
                      <strong>Final:</strong> ${t.transcript}
                    </div>
                  `
                )}
                ${this.currentPartial
                  ? html`
                      <div class="transcript-item partial">
                        <strong>Partial:</strong> ${this.currentPartial}
                      </div>
                    `
                  : ''}
              `}
        </div>
      </div>
    `;
  }

  connectedCallback() {
    if (super.connectedCallback) {
      super.connectedCallback();
    }
    this._initializeSocket();
  }

  private async _initializeSocket() {
    this.isConnecting = true;
    this.connectionAttempts++;

    try {
      console.log(
        `Attempting to connect to Socket.IO server (attempt ${this.connectionAttempts})...`
      );

      // Create a Socket.IO client using our wrapper
      this.socket = await createSocketClient();

      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket?.id);
        this.isConnected = true;
        this.isConnecting = false;
        this.error = '';
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
        this.isConnected = false;
        this._stopRecording();
      });

      this.socket.on('connect_error', (err: Error) => {
        console.error('Connection error:', err);
        this.error = `Connection error: ${err.message}. Make sure the server is running at http://localhost:3000.`;
        this.isConnected = false;
        this.isConnecting = false;
      });

      this.socket.on('transcriptionData', (data: Transcript) => {
        if (data.isFinal) {
          // Add final transcript to the list of finished transcripts
          this.transcripts = [...this.transcripts, data];
          // Clear the current partial
          this.currentPartial = '';
        } else {
          // Update the current partial transcript
          this.currentPartial = data.transcript;
        }

        // Scroll to bottom of transcript container
        setTimeout(() => {
          const container = this.shadowRoot?.querySelector('.transcripts');
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        }, 0);
      });

      this.socket.on('streamError', (errorMsg: string) => {
        console.error('Streaming error:', errorMsg);
        this.error = `Streaming error: ${errorMsg}`;
        this._stopRecording();
      });
    } catch (err) {
      console.error('Failed to initialize socket:', err);
      this.error = `Failed to initialize socket: ${
        err instanceof Error ? err.message : String(err)
      }`;
      this.isConnecting = false;
    }
  }

  disconnectedCallback() {
    if (super.disconnectedCallback) {
      super.disconnectedCallback();
    }
    this._stopRecording();
    this.socket?.disconnect();
  }

  private _retryConnection() {
    this.error = '';
    this._initializeSocket();
  }

  async _startRecording() {
    try {
      this.transcripts = [];
      this.currentPartial = '';
      this.error = '';

      // Check if we're connected to the server
      if (!this.isConnected) {
        this.error =
          'Not connected to the server. Please retry the connection.';
        return;
      }

      // Check if the browser supports the MediaRecorder API
      if (!window.MediaRecorder) {
        this.error =
          'Your browser does not support the MediaRecorder API. Please try a different browser.';
        return;
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Check if the browser supports the WebM/Opus codec
      let mimeType = 'audio/webm; codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = '';
        this.error =
          'Warning: Your browser does not support the WebM/Opus codec. Using default codec instead.';
      }

      // Setup MediaRecorder with Opus if supported
      this.mediaRecorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );

      // Fire up the server side streaming
      this.socket?.emit('startStream', {
        // Optional: pass extra config (languageCode, etc.)
      });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          // Send chunk to server
          this.socket?.emit('audioData', e.data);
        }
      };

      // Send data in small intervals - reduced from 250ms to 100ms for more frequent updates
      this.mediaRecorder.start(100); // gather chunks every 100ms for more responsive transcription
      this.isRecording = true;
    } catch (err) {
      console.error('Could not start recording:', err);

      // Provide more specific error messages based on the error
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        this.error =
          'Microphone access denied. Please allow microphone access in your browser settings.';
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        this.error =
          'No microphone found. Please connect a microphone and try again.';
      } else {
        this.error = `Could not start recording: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }

      this.isRecording = false;
    }
  }

  _stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();

      // Stop all audio tracks
      this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());

      this.mediaRecorder = null;
      this.isRecording = false;

      // Tell server to stop the GCP stream
      this.socket?.emit('stopStream');
    }
  }
}

// Add the io property to the Window interface
declare global {
  interface Window {
    io: any;
  }
}
