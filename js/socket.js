// WebSocket client wrapper

class GameSocket {
  constructor() {
    this.ws = null;
    this.handlers = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;

      console.log('Connecting to:', wsUrl);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received:', data.event, data);
          const { event: eventName, ...payload } = data;

          if (this.handlers[eventName]) {
            this.handlers[eventName].forEach(handler => handler(payload));
          }
        } catch (err) {
          console.error('Error parsing message:', err);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.emit('disconnected', {});

        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => this.connect(), 2000);
        }
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        reject(err);
      };
    });
  }

  on(event, handler) {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event].push(handler);
  }

  off(event, handler) {
    if (this.handlers[event]) {
      this.handlers[event] = this.handlers[event].filter(h => h !== handler);
    }
  }

  emit(event, data) {
    if (this.handlers[event]) {
      this.handlers[event].forEach(handler => handler(data));
    }
  }

  send(event, data = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('Sending:', event, data);
      this.ws.send(JSON.stringify({ event, ...data }));
    } else {
      console.error('WebSocket not connected');
    }
  }

  quickPlay(name) {
    this.send('quick:play', { name });
  }

  sendAction(action, amount = 0) {
    this.send('action:bet', { action, amount });
  }

  sendDraw(cardIndices) {
    this.send('draw:select', { cardIndices });
  }
}

// Global socket instance
const socket = new GameSocket();
