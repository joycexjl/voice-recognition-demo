/**
 * A simple wrapper for Socket.IO client that loads the library from a CDN
 * to avoid build issues with the Socket.IO client package.
 */

// Define the interface for the Socket.IO client
export interface SocketClient {
  id: string;
  connected: boolean;
  on(event: string, callback: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
  disconnect(): void;
}

// Define the interface for the Socket.IO manager
export interface SocketIO {
  (url?: string, options?: any): SocketClient;
}

// Load Socket.IO client from CDN
export async function loadSocketIO(): Promise<SocketIO> {
  return new Promise<SocketIO>((resolve, reject) => {
    // Check if Socket.IO is already loaded
    if ((window as any).io) {
      resolve((window as any).io);
      return;
    }

    // Create a script element to load Socket.IO from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.6.0/socket.io.min.js';
    script.integrity =
      'sha384-c79GN5VsunZvi+Q/WObgk2in0CbZsHnjEqvFxC5DxHn9lTfNce2WW6h2pH6u/kF+';
    script.crossOrigin = 'anonymous';

    // Resolve the promise when the script is loaded
    script.onload = () => resolve((window as any).io);

    // Reject the promise if the script fails to load
    script.onerror = () => reject(new Error('Failed to load Socket.IO client'));

    // Add the script to the document
    document.head.appendChild(script);
  });
}

// Create a Socket.IO client
export async function createSocketClient(): Promise<SocketClient> {
  const io = await loadSocketIO();

  // Connect to the server with explicit configuration
  // This ensures we're connecting to the correct server with the right settings
  return io('http://localhost:3000', {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
  });
}
