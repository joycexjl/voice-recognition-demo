/* stylelint-disable */
import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import {
  createStreamConnection,
  sendAudioData,
  startStream,
  stopStream,
} from '../helpers/stream-client.js';

interface Transcript {
  transcript: string;
  isFinal: boolean;
  edited?: boolean;
}

@customElement('streaming-transcribe')
export class StreamingTranscribe extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
        Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue',
        sans-serif;
    }

    .container {
      display: flex;
      flex-direction: column;
      max-width: 800px;
      height: 100%;
      margin: 0 auto;
      padding: 1rem;
    }

    .controls {
      display: flex;
      flex-shrink: 0;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    button {
      flex-shrink: 0;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      background-color: #007bff;
      color: white;
      font-size: 1rem;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    button:hover {
      background-color: #0056b3;
    }

    button:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }

    .transcripts {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.5rem;
      overflow-y: auto;
      min-height: 0;
      margin-bottom: 1rem;
    }

    .transcript-container {
      position: relative;
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 100px;
      padding: 0.5rem;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      background-color: #f8f9fa;
    }

    .transcript-container textarea {
      flex: 1;
      overflow-y: auto;
      box-sizing: border-box;
      width: 100%;
      min-height: 100px;
      padding: 0.5rem;
      border: none;
      background: transparent;
      font-size: inherit;
      font-family: inherit;
      line-height: inherit;
      resize: none;
    }

    .transcript-container textarea:focus {
      outline: none;
    }

    .transcript-container textarea::placeholder {
      color: #6c757d;
    }

    .transcript-container.editable textarea {
      border: 1px solid #007bff;
      background-color: white;
      cursor: text;
    }

    .transcript-container.editable textarea:focus {
      outline: 2px solid #007bff;
      outline-offset: -2px;
    }

    .transcript-container.typing::after {
      content: '';
      position: absolute;
      right: 1rem;
      bottom: 1rem;
      width: 2px;
      height: 1.2em;
      background-color: #007bff;
      animation: blink 1s step-end infinite;
    }

    @keyframes blink {
      50% {
        opacity: 0;
      }
    }

    .error {
      flex-shrink: 0;
      margin-top: 0.5rem;
      padding: 0.5rem;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
      background-color: #f8d7da;
      color: #dc3545;
    }

    .status {
      flex-shrink: 0;
      margin-top: 0.5rem;
      color: #6c757d;
      font-size: 0.875rem;
    }

    .edit-indicator {
      flex-shrink: 0;
      margin-top: 0.25rem;
      color: #6c757d;
      font-style: italic;
      font-size: 0.75rem;
    }
  `;

  @state()
  private eventSource: EventSource | null = null;

  @state()
  private mediaRecorder: MediaRecorder | null = null;

  @state()
  private isRecording = false;

  @state()
  private transcripts: Transcript[] = [];

  @state()
  private currentPartial = '';

  @state()
  private previousPartial = '';

  @state()
  private isTyping = false;

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

  @state()
  private sessionId = '';

  @state()
  private isEditing = false;

  render() {
    return html`
      <div class="container">
        <div class="controls">
          <button @click=${this._startRecording} ?disabled=${this.isRecording}>
            Start Recording
          </button>
          <button @click=${this._stopRecording} ?disabled=${!this.isRecording}>
            Stop Recording
          </button>
        </div>

        ${this.error ? html` <div class="error">${this.error}</div> ` : null}

        <div class="transcripts">
          ${this.transcripts.map(
            (t) => html`
              <div class="transcript-container ${t.edited ? 'editable' : ''}">
                <textarea
                  .value=${t.transcript}
                  ?readonly=${!t.edited}
                  @change=${(e: Event) => this._handleTranscriptEdit(e, t)}
                  placeholder="Transcription will appear here..."
                ></textarea>
                ${t.edited
                  ? html` <div class="edit-indicator">(Edited)</div> `
                  : null}
              </div>
            `
          )}
          ${this.currentPartial
            ? html`
                <div
                  class="transcript-container ${this.isTyping ? 'typing' : ''}"
                >
                  <textarea
                    .value=${this.currentPartial}
                    readonly
                    placeholder="Partial transcription will appear here..."
                  ></textarea>
                </div>
              `
            : null}
        </div>

        ${this.isRecording
          ? html` <div class="status">Recording in progress...</div> `
          : null}
      </div>
    `;
  }

  connectedCallback() {
    if (super.connectedCallback) {
      super.connectedCallback();
    }
    this.sessionId = this._generateSessionId();
  }

  disconnectedCallback() {
    if (super.disconnectedCallback) {
      super.disconnectedCallback();
    }
    this._stopRecording();
    this._closeEventSource();
  }

  private _generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  private _retryConnection() {
    this.error = '';
    this._setupEventSource();
  }

  private _setupEventSource() {
    this.isConnecting = true;
    this.connectionAttempts++;

    try {
      console.log(
        `Setting up Server-Sent Events connection (attempt ${this.connectionAttempts})...`
      );

      this._closeEventSource();

      this.eventSource = createStreamConnection(this.sessionId);

      this.eventSource.onopen = () => {
        console.log('SSE connection opened');
        this.isConnected = true;
        this.isConnecting = false;
        this.error = '';
      };

      this.eventSource.onerror = (err) => {
        console.error('SSE connection error:', err);
        this.error =
          'Connection error. Make sure the server is running at http://localhost:3000.';
        this.isConnected = false;
        this.isConnecting = false;
        this._closeEventSource();
      };

      this.eventSource.addEventListener('transcriptionData', (event) => {
        const data = JSON.parse(event.data) as Transcript;

        if (data.isFinal) {
          this.transcripts = [...this.transcripts, { ...data, edited: true }];
          this.currentPartial = '';
          this.isTyping = false;
        } else {
          this.previousPartial = this.currentPartial;
          this.currentPartial = data.transcript;
          this.isTyping = true;

          // Reset typing state after a short delay
          setTimeout(() => {
            if (this.currentPartial === data.transcript) {
              this.isTyping = false;
            }
          }, 500);
        }

        this._scrollToBottom();
      });

      this.eventSource.addEventListener('streamError', (event) => {
        const errorMsg = event.data;
        console.error('Streaming error:', errorMsg);
        this.error = `Streaming error: ${errorMsg}`;
        this._stopRecording();
      });
    } catch (err) {
      console.error('Failed to setup EventSource:', err);
      this.error = `Failed to setup EventSource: ${
        err instanceof Error ? err.message : String(err)
      }`;
      this.isConnecting = false;
    }
  }

  private _scrollToBottom() {
    setTimeout(() => {
      const container = this.shadowRoot?.querySelector('.transcripts');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 0);
  }

  private _closeEventSource() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  async _startRecording() {
    try {
      this.transcripts = [];
      this.currentPartial = '';
      this.error = '';

      if (!this.eventSource) {
        this._setupEventSource();
      }

      if (!window.MediaRecorder) {
        this.error = 'Your browser does not support the MediaRecorder API.';
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      let mimeType = 'audio/webm; codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = '';
      }

      this.mediaRecorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );

      this.mediaRecorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0) {
          try {
            await sendAudioData(
              this.sessionId,
              e.data,
              mimeType || 'audio/webm'
            );
          } catch (err) {
            console.error('Error sending audio data:', err);
            this.error = `Error sending audio data: ${
              err instanceof Error ? err.message : String(err)
            }`;
          }
        }
      };

      await startStream(this.sessionId);
      this.mediaRecorder.start(100);
      this.isRecording = true;
    } catch (err) {
      console.error('Could not start recording:', err);

      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        this.error = 'Microphone access denied.';
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        this.error = 'No microphone found.';
      } else {
        this.error = `Recording error: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }

      this.isRecording = false;
    }
  }

  async _stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      this.mediaRecorder = null;
      this.isRecording = false;

      try {
        await stopStream(this.sessionId);
      } catch (err) {
        console.error('Error stopping stream:', err);
      }
    }
  }

  private _handleTranscriptEdit(event: Event, transcript: Transcript) {
    const textarea = event.target as HTMLTextAreaElement;
    const newText = textarea.value;

    if (newText !== transcript.transcript) {
      transcript.transcript = newText;
      transcript.edited = true;
      this.requestUpdate();
    }
  }
}
