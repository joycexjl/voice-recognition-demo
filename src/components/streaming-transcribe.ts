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
      padding: 16px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .container {
      background-color: #f5f5f5;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    h2 {
      color: #333;
      margin-top: 0;
    }
    
    .controls {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    
    button {
      background-color: #4285f4;
      color: white;
      border: none;
      padding: 10px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      transition: background-color 0.3s;
    }
    
    button:hover {
      background-color: #3367d6;
    }
    
    button:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
    
    button.stop {
      background-color: #ea4335;
    }
    
    button.stop:hover {
      background-color: #d33426;
    }
    
    .transcripts {
      margin-top: 20px;
      padding: 16px;
      background-color: white;
      border-radius: 4px;
      border: 1px solid #ddd;
      max-height: 400px;
      overflow-y: auto;
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
      background-color: #f8f9fa;
      font-style: italic;
    }
    
    .status {
      margin-top: 10px;
      font-size: 14px;
      color: #666;
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
      background-color: #ea4335;
      border-radius: 50%;
      margin-right: 8px;
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
      color: #ea4335;
      margin-top: 10px;
      padding: 10px;
      background-color: #ffebee;
      border-radius: 4px;
      border: 1px solid #ffcdd2;
    }
    
    .troubleshooting {
      margin-top: 10px;
      padding: 10px;
      background-color: #e8f5e9;
      border-radius: 4px;
      border: 1px solid #c8e6c9;
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
            ?disabled=${this.isRecording || !this.isConnected || this.isConnecting}
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
          ${this.error ? 
            html`<button @click=${this._retryConnection} ?disabled=${this.isConnecting}>
              Retry Connection
            </button>` : 
            ''
          }
        </div>
        
        ${this.isRecording ? 
          html`<div class="recording">
            <div class="recording-indicator"></div>
            Recording...
          </div>` : 
          ''
        }
        
        ${this.error ? 
          html`
            <div class="error">
              <strong>Error:</strong> ${this.error}
              <button @click=${() => this.showTroubleshooting = !this.showTroubleshooting}>
                ${this.showTroubleshooting ? 'Hide' : 'Show'} Troubleshooting Tips
              </button>
            </div>
            ${this.showTroubleshooting ? 
              html`
                <div class="troubleshooting">
                  <h3>Troubleshooting Tips:</h3>
                  <ul>
                    <li>Make sure the server is running at http://localhost:3000</li>
                    <li>Check if your browser allows microphone access</li>
                    <li>Try refreshing the page</li>
                    <li>Check if your firewall is blocking WebSocket connections</li>
                    <li>Try using a different browser</li>
                  </ul>
                </div>
              ` : 
              ''
            }
          ` : 
          ''
        }
        
        ${this.isConnecting ? 
          html`<div class="status">Connecting to server (attempt ${this.connectionAttempts})...</div>` : 
          !this.isConnected && !this.error ? 
            html`<div class="status">Connecting to server...</div>` : 
            ''
        }
        
        <div class="transcripts">
          ${this.transcripts.length === 0 ? 
            html`<div class="status">Speak after clicking "Start Recording"</div>` : 
            this.transcripts.map(
              (t) => html`
                <div class="transcript-item ${t.isFinal ? 'final' : 'partial'}">
                  <strong>${t.isFinal ? 'Final:' : 'Partial:'}</strong> ${t.transcript}
                </div>
              `
            )
          }
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
      console.log(`Attempting to connect to Socket.IO server (attempt ${this.connectionAttempts})...`);
      
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
        // Add new transcript to the list
        this.transcripts = [...this.transcripts, data];
        
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
      this.error = `Failed to initialize socket: ${err instanceof Error ? err.message : String(err)}`;
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
      this.error = '';
      
      // Check if we're connected to the server
      if (!this.isConnected) {
        this.error = 'Not connected to the server. Please retry the connection.';
        return;
      }
      
      // Check if the browser supports the MediaRecorder API
      if (!window.MediaRecorder) {
        this.error = 'Your browser does not support the MediaRecorder API. Please try a different browser.';
        return;
      }
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Check if the browser supports the WebM/Opus codec
      let mimeType = 'audio/webm; codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = '';
        this.error = 'Warning: Your browser does not support the WebM/Opus codec. Using default codec instead.';
      }
      
      // Setup MediaRecorder with Opus if supported
      this.mediaRecorder = new MediaRecorder(stream, 
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
      
      // Send data in small intervals
      this.mediaRecorder.start(250); // gather chunks every 250ms
      this.isRecording = true;
    } catch (err) {
      console.error('Could not start recording:', err);
      
      // Provide more specific error messages based on the error
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        this.error = 'Microphone access denied. Please allow microphone access in your browser settings.';
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        this.error = 'No microphone found. Please connect a microphone and try again.';
      } else {
        this.error = `Could not start recording: ${err instanceof Error ? err.message : String(err)}`;
      }
      
      this.isRecording = false;
    }
  }

  _stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      
      // Stop all audio tracks
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      
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