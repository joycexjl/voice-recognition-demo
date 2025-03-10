/**
 * Copyright (c) IBM, Corp. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import config from '../config.js';
import { PageElement } from '../helpers/page-element.js';
import '../components/batch-transcribe.js';
import '../components/streaming-transcribe.js';

@customElement('page-home')
export class PageHome extends PageElement {
  static styles = css`
    section {
      padding: 1rem;
    }
    
    .header {
      text-align: center;
      margin-bottom: 2rem;
    }
    
    h1 {
      font-size: 2rem;
      color: #202124;
    }
    
    .description {
      color: #5f6368;
      max-width: 800px;
      margin: 0 auto 2rem;
      line-height: 1.5;
    }
    
    .tabs {
      display: flex;
      justify-content: center;
      margin-bottom: 2rem;
    }
    
    .tab {
      padding: 0.75rem 1.5rem;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      font-size: 1rem;
      font-weight: 500;
      color: #5f6368;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .tab:hover {
      color: #202124;
    }
    
    .tab.active {
      color: #4285f4;
      border-bottom-color: #4285f4;
    }
    
    .tab-content {
      margin: 0 auto;
    }
    
    .tab-panel {
      display: none;
    }
    
    .tab-panel.active {
      display: block;
    }
  `;

  @state()
  private _activeTab = 'batch';

  render() {
    return html`
      <section>
        <div class="header">
          <h1>Speech-to-Text Transcription</h1>
          <p class="description">
            Convert speech to text using Google's Speech-to-Text API. 
            Choose between batch processing for pre-recorded audio files or 
            real-time streaming for live transcription.
          </p>
        </div>
        
        <div class="tabs">
          <button 
            class="tab ${this._activeTab === 'batch' ? 'active' : ''}" 
            @click=${() => this._setActiveTab('batch')}
          >
            Batch Transcription
          </button>
          <button 
            class="tab ${this._activeTab === 'streaming' ? 'active' : ''}" 
            @click=${() => this._setActiveTab('streaming')}
          >
            Real-time Streaming
          </button>
        </div>
        
        <div class="tab-content">
          <div class="tab-panel ${this._activeTab === 'batch' ? 'active' : ''}">
            <batch-transcribe></batch-transcribe>
          </div>
          <div class="tab-panel ${this._activeTab === 'streaming' ? 'active' : ''}">
            <streaming-transcribe></streaming-transcribe>
          </div>
        </div>
      </section>
    `;
  }

  _setActiveTab(tab: string) {
    this._activeTab = tab;
    this.requestUpdate();
  }

  meta() {
    return {
      title: `${config.appName} - Speech-to-Text`,
      titleTemplate: null,
      description: 'Convert speech to text using Google Speech-to-Text API',
    };
  }
}
