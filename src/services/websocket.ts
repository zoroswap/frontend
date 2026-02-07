import { API } from '@/lib/config';

/**
 * WebSocket message types from the backend
 * Based on the Rust ServerMessage enum
 */
export type SubscriptionChannel =
  | { channel: 'order_updates'; order_id?: string }
  | { channel: 'pool_state'; faucet_id?: string }
  | { channel: 'oracle_prices'; oracle_id?: string }
  | { channel: 'stats' };

export type ClientMessage =
  | { type: 'Subscribe'; channels: SubscriptionChannel[] }
  | { type: 'Unsubscribe'; channels: SubscriptionChannel[] }
  | { type: 'Ping' };

export type OrderStatus = 'pending' | 'matching' | 'executed' | 'failed' | 'expired';

export interface OrderUpdateDetails {
  amount_in: number;
  amount_out?: number;
  asset_in_faucet: string;
  asset_out_faucet: string;
  reason?: string;
}

export type ServerMessage =
  | { type: 'Subscribed'; channel: SubscriptionChannel }
  | { type: 'Unsubscribed'; channel: SubscriptionChannel }
  | {
      type: 'OrderUpdate';
      order_id: string;
      note_id: string;
      status: OrderStatus;
      timestamp: number;
      details: OrderUpdateDetails;
    }
  | {
      type: 'PoolStateUpdate';
      faucet_id: string;
      balances: {
        reserve: string;
        reserve_with_slippage: string;
        total_liabilities: string;
      };
      timestamp: number;
    }
  | {
      type: 'OraclePriceUpdate';
      oracle_id: string;
      faucet_id: string;
      price: number;
      timestamp: number;
    }
  | {
      type: 'StatsUpdate';
      open_orders: number;
      closed_orders: number;
      timestamp: number;
    }
  | { type: 'Pong' }
  | { type: 'Error'; message: string };

export type MessageHandler = (message: ServerMessage) => void;

/**
 * WebSocket client for ZoroSwap real-time updates
 * Manages connection, reconnection, and message routing
 */
export class ZoroWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private baseReconnectInterval: number;
  private maxReconnectInterval: number;
  private currentReconnectInterval: number;
  private pingInterval: number;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingIntervalId: ReturnType<typeof setInterval> | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private subscriptions: Set<string> = new Set();
  private isIntentionallyClosed = false;
  private isConnecting = false;

  constructor() {
    this.url = `${API.wsEndpoint}/ws`;
    this.baseReconnectInterval = 1000;    // Start at 1 second
    this.maxReconnectInterval = 60000;    // Max 60 seconds
    this.currentReconnectInterval = this.baseReconnectInterval;
    this.pingInterval = 30000;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isIntentionallyClosed = false;
    this.isConnecting = true;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.currentReconnectInterval = this.baseReconnectInterval; // Reset on successful connection
        this.startPingInterval();
        this.resubscribeAll();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: ServerMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.stopPingInterval();

        if (!this.isIntentionallyClosed) {
          this.attemptReconnect();
        }
      };
    } catch {
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.stopPingInterval();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Subscribe to channels
   */
  subscribe(channels: SubscriptionChannel[]): void {
    // Filter out already-subscribed channels
    const newChannels = channels.filter(channel => {
      const key = JSON.stringify(channel);
      if (this.subscriptions.has(key)) {
        return false;
      }
      this.subscriptions.add(key);
      return true;
    });

    if (newChannels.length === 0) {
      return;
    }

    const message: ClientMessage = {
      type: 'Subscribe',
      channels: newChannels,
    };

    this.send(message);
  }

  /**
   * Unsubscribe from channels
   */
  unsubscribe(channels: SubscriptionChannel[]): void {
    const message: ClientMessage = {
      type: 'Unsubscribe',
      channels,
    };

    this.send(message);

    channels.forEach(channel => {
      this.subscriptions.delete(JSON.stringify(channel));
    });
  }

  /**
   * Add a message handler
   */
  addMessageHandler(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Get connection state
   */
  getReadyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private send(message: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private handleMessage(message: ServerMessage): void {
    // Notify all handlers
    this.messageHandlers.forEach(handler => {
      handler(message);
    });
  }

  private attemptReconnect(): void {
    // Never give up - always try to reconnect with exponential backoff
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, this.currentReconnectInterval);

    // Exponential backoff: double the interval up to maxReconnectInterval
    this.currentReconnectInterval = Math.min(
      this.currentReconnectInterval * 2,
      this.maxReconnectInterval
    );
  }

  private resubscribeAll(): void {
    if (this.subscriptions.size === 0) return;

    const channels: SubscriptionChannel[] = Array.from(this.subscriptions).map(
      sub => JSON.parse(sub),
    );

    // Send subscription request directly without adding to subscriptions again
    const message: ClientMessage = {
      type: 'Subscribe',
      channels,
    };
    this.send(message);
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingIntervalId = setInterval(() => {
      this.send({ type: 'Ping' });
    }, this.pingInterval);
  }

  private stopPingInterval(): void {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }
}

// Singleton instance
let wsInstance: ZoroWebSocket | null = null;

/**
 * Get or create the WebSocket singleton instance
 */
export function getWebSocket(): ZoroWebSocket {
  if (!wsInstance) {
    wsInstance = new ZoroWebSocket();
  }
  return wsInstance;
}
