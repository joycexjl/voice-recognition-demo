/**
 * Helper functions for Server-Sent Events (SSE) streaming transcription.
 */

/**
 * Creates an EventSource connection for streaming transcription
 */
export function createStreamConnection(
  sessionId: string,
  baseUrl = 'http://localhost:3000'
): EventSource {
  if (!('EventSource' in window)) {
    throw new Error('Server-Sent Events are not supported in this browser');
  }

  return new EventSource(`${baseUrl}/stream/${sessionId}`);
}

/**
 * Sends audio data to the server
 */
export async function sendAudioData(
  sessionId: string,
  audioData: Blob,
  contentType: string,
  baseUrl = 'http://localhost:3000'
): Promise<void> {
  await fetch(`${baseUrl}/audio/${sessionId}`, {
    method: 'POST',
    body: audioData,
    headers: {
      'Content-Type': contentType,
    },
  });
}

/**
 * Starts a new transcription stream
 */
export async function startStream(
  sessionId: string,
  baseUrl = 'http://localhost:3000'
): Promise<void> {
  await fetch(`${baseUrl}/start/${sessionId}`, {
    method: 'POST',
  });
}

/**
 * Stops a transcription stream
 */
export async function stopStream(
  sessionId: string,
  baseUrl = 'http://localhost:3000'
): Promise<void> {
  await fetch(`${baseUrl}/stop/${sessionId}`, {
    method: 'POST',
  });
}
