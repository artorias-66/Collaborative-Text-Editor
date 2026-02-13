import { io } from 'socket.io-client';
import Cookies from 'js-cookie';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  socket: any;
  listeners: Map<string, any>;
  connectionPromise: Promise<any> | null;

  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.connectionPromise = null;
  }

  connect() {
    if (this.socket?.connected) {
      return Promise.resolve(this.socket);
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    const token = Cookies.get('token');

    this.connectionPromise = new Promise((resolve, reject) => {
      this.socket = io(SOCKET_URL, {
        auth: { token },
        withCredentials: true,
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket.id);
        resolve(this.socket);
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
        this.connectionPromise = null;
      });

      this.socket.on('connect_error', (error: any) => {
        console.error('Socket connection error:', error);
        this.connectionPromise = null;
        reject(error);
      });

      this.socket.on('error', (error: any) => {
        console.error('Socket error:', error);
      });

      // Set up existing listeners
      this.listeners.forEach((callback, event) => {
        this.socket.on(event, callback);
      });
    });

    return this.connectionPromise;
  }

  async emit(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      try {
        await this.connect();
        if (this.socket?.connected) {
          this.socket.emit(event, data);
        }
      } catch (error) {
        console.error('Failed to connect socket:', error);
      }
    }
  }

  async joinDocument(documentId: string) {
    await this.emit('join-document', documentId);
  }

  async leaveDocument(documentId: string) {
    await this.emit('leave-document', documentId);
  }

  async sendTextChange(documentId: string, delta: any, content: any) {
    await this.emit('text-change', { documentId, delta, content });
  }

  async sendCursorMove(documentId: string, range: any) {
    await this.emit('cursor-move', { documentId, range });
  }

  async saveDocument(documentId: string, content: any, title: string) {
    await this.emit('save-document', { documentId, content, title });
  }

  async requestAIAnalysis(documentId: string, text: string, type: string) {
    await this.emit('ai-analyze-text', { documentId, text, type });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionPromise = null;
    }
  }

  on(event: string, callback: any) {
    this.listeners.set(event, callback);
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string) {
    this.listeners.delete(event);
    if (this.socket) {
      this.socket.off(event);
    }
  }
}

export default new SocketService();

