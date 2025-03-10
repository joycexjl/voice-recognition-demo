import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

@customElement('batch-transcribe')
export class BatchTranscribe extends LitElement {
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
    
    .form-group {
      margin-bottom: 16px;
    }
    
    input[type="file"] {
      display: block;
      margin-bottom: 10px;
      width: 100%;
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
    
    .result {
      margin-top: 20px;
      padding: 16px;
      background-color: white;
      border-radius: 4px;
      border: 1px solid #ddd;
      white-space: pre-wrap;
      max-height: 300px;
      overflow-y: auto;
    }
    
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 20px;
    }
    
    .loading::after {
      content: "Processing...";
      margin-left: 8px;
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
    
    .file-info {
      margin-top: 10px;
      font-size: 14px;
      color: #666;
    }
  `;

  @state()
  private transcription = '';
  
  @state()
  private isLoading = false;
  
  @state()
  private error = '';
  
  @state()
  private showTroubleshooting = false;
  
  @state()
  private selectedFile: File | null = null;

  render() {
    return html`
      <div class="container">
        <h2>Batch Transcription</h2>
        <div class="form-group">
          <input 
            id="audioFile" 
            type="file" 
            accept="audio/*" 
            ?disabled=${this.isLoading}
            @change=${this._handleFileChange}
          />
          <button 
            @click=${this._submitFile} 
            ?disabled=${this.isLoading || !this.selectedFile}
          >
            Upload & Transcribe
          </button>
        </div>
        
        ${this.selectedFile ? 
          html`<div class="file-info">
            <strong>Selected file:</strong> ${this.selectedFile.name} (${this._formatFileSize(this.selectedFile.size)})
          </div>` : 
          ''
        }
        
        ${this.isLoading ? 
          html`<div class="loading">
            <span class="spinner"></span>
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
                    <li>Check that your audio file is in a supported format (WAV, MP3, FLAC, etc.)</li>
                    <li>Try using a smaller audio file (less than 10MB)</li>
                    <li>Ensure your audio file contains speech</li>
                    <li>Try refreshing the page</li>
                  </ul>
                </div>
              ` : 
              ''
            }
          ` : 
          ''
        }
        
        ${this.transcription ? 
          html`<div class="result">${this.transcription}</div>` : 
          ''
        }
      </div>
    `;
  }
  
  private _handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.error = '';
    } else {
      this.selectedFile = null;
    }
  }
  
  private _formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async _submitFile() {
    if (!this.selectedFile) {
      this.error = 'Please select an audio file first';
      return;
    }
    
    this.isLoading = true;
    this.error = '';
    this.transcription = '';

    const formData = new FormData();
    formData.append('audio', this.selectedFile);

    try {
      console.log('Sending request to /api/transcribe');
      
      const resp = await fetch('http://localhost:3000/api/transcribe', {
        method: 'POST',
        body: formData,
        // Include credentials and CORS headers
        credentials: 'include',
        mode: 'cors'
      });
      
      if (!resp.ok) {
        throw new Error(`Server returned ${resp.status} ${resp.statusText}`);
      }
      
      const contentType = resp.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Expected JSON response but got ${contentType}`);
      }
      
      const data = await resp.json();
      
      if (data.error) {
        this.error = `Error: ${data.error}`;
      } else {
        this.transcription = data.transcription || 'No transcription returned';
      }
    } catch (err) {
      console.error('Transcription error:', err);
      
      // Provide more specific error messages
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        this.error = 'Failed to connect to the server. Make sure the server is running at http://localhost:3000.';
      } else if (err instanceof SyntaxError) {
        this.error = 'Invalid response from server. The server did not return valid JSON.';
      } else {
        this.error = `Error: ${err instanceof Error ? err.message : String(err)}`;
      }
    } finally {
      this.isLoading = false;
    }
  }
} 