import {
  getWebSocket,
  type MessageHandler,
  type OrderStatus,
  type OrderUpdateDetails,
  type ServerMessage,
  type SubscriptionChannel,
} from '@/services/websocket';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface UseWebSocketOptions {
  channels?: SubscriptionChannel[];
  onMessage?: MessageHandler;
  autoConnect?: boolean;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  subscribe: (channels: SubscriptionChannel[]) => void;
  unsubscribe: (channels: SubscriptionChannel[]) => void;
  connect: () => void;
  disconnect: () => void;
}

/**
 * React hook for WebSocket connection management.
 * Auto-connects on mount and subscribes to specified channels.
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { channels = [], onMessage, autoConnect = true } = options;

  const ws = getWebSocket();
  const [isConnected, setIsConnected] = useState(ws.isConnected());
  const channelsRef = useRef(channels);
  const onMessageRef = useRef(onMessage);

  // Keep refs up to date
  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  // Connection state monitoring
  useEffect(() => {
    const checkConnection = setInterval(() => {
      setIsConnected(ws.isConnected());
    }, 1000);

    return () => clearInterval(checkConnection);
  }, [ws]);

  // Auto-connect and message handling
  useEffect(() => {
    if (autoConnect) {
      ws.connect();
    }

    // Register message handler
    const unsubscribeHandler = ws.addMessageHandler((message: ServerMessage) => {
      setIsConnected(true);
      onMessageRef.current?.(message);
    });

    return () => {
      unsubscribeHandler();
    };
  }, [ws, autoConnect]);

  // Subscribe to channels
  useEffect(() => {
    if (channels.length === 0) return;

    // Wait for connection before subscribing
    const subscribeWhenReady = () => {
      if (ws.isConnected()) {
        ws.subscribe(channels);
      } else {
        // Retry after a short delay
        setTimeout(subscribeWhenReady, 100);
      }
    };

    subscribeWhenReady();

    return () => {
      if (ws.isConnected()) {
        ws.unsubscribe(channels);
      }
    };
  }, [ws, channels]);

  const value = useMemo(() => ({
    isConnected,
    subscribe: (channels: SubscriptionChannel[]) => ws.subscribe(channels),
    unsubscribe: (channels: SubscriptionChannel[]) => ws.unsubscribe(channels),
    connect: () => ws.connect(),
    disconnect: () => ws.disconnect(),
  }), [isConnected, ws]);

  return value;
}

/**
 * Hook for tracking order status updates
 */
export function useOrderUpdates(orderIds?: string[]) {
  const [orderStatus, setOrderStatus] = useState<
    Record<string, {
      status: OrderStatus;
      timestamp: number;
      details: OrderUpdateDetails;
    }>
  >({});

  const channels: SubscriptionChannel[] = useMemo(() => {
    // If orderIds is undefined or empty, subscribe to all order updates
    if (!orderIds || orderIds.length === 0) {
      return [{ channel: 'order_updates' as const }];
    }
    // Otherwise subscribe to specific order IDs
    return orderIds.map(id => ({ channel: 'order_updates' as const, order_id: id }));
  }, [orderIds]);

  const { subscribe, unsubscribe, isConnected } = useWebSocket({
    channels,
    onMessage: (message) => {
      if (message.type === 'OrderUpdate') {
        // Key by note_id so frontend can look up status by the note hash it knows
        setOrderStatus(prev => ({
          ...prev,
          [message.note_id]: {
            status: message.status,
            timestamp: message.timestamp,
            details: message.details,
          },
        }));
      }
    },
  });

  const subscribeToOrder = useCallback((orderId: string) => {
    subscribe([{ channel: 'order_updates', order_id: orderId }]);
  }, [subscribe]);

  const unsubscribeFromOrder = useCallback((orderId: string) => {
    unsubscribe([{ channel: 'order_updates', order_id: orderId }]);
  }, [unsubscribe]);

  return {
    orderStatus,
    subscribeToOrder,
    unsubscribeFromOrder,
    isConnected,
  };
}
