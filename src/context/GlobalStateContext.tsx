'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { WebSocketMessage } from '../types/WebSocketMessage';

interface GlobalStateContextType {
  apiStatus: 'online' | 'offline';
  wsStatus: 'connected' | 'connecting' | 'disconnected';
  solPrice: number | null;
  solPriceChange: number | null;
  solPriceLoading: boolean;
  collectionSizes: { [key: string]: number };
  reconnectWebSocket: () => void;
  thoughts: string[];
  checkApiHealth: () => Promise<boolean>;
}

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(undefined);

const MAX_THOUGHTS = 100;
const DEDUP_WINDOW_MS = 5000;

// WebSocket connection constants matching the server configuration
const PING_INTERVAL = 20000; // 20 seconds
const PONG_TIMEOUT = 10000; // 10 seconds
const CLOUDFLARE_TIMEOUT = 100000; // 100 seconds

// WebSocket message types from the server
enum WebSocketMessageType {
  CONNECTED = 'connected',
  ECHO = 'echo',
  TOKEN_CATEGORIZATION = 'token_categorization',
  TOKEN_MIGRATION = 'token_migration',
  NEW_KEYWORD = 'new_keyword',
  NEW_CALL = 'new_call'
}

export function GlobalStateProvider({ children }: { children: React.ReactNode }) {
  const [apiStatus, setApiStatus] = useState<'online' | 'offline'>('offline');
  const [wsStatus, setWsStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [solPriceChange, setSolPriceChange] = useState<number | null>(null);
  const [solPriceLoading, setSolPriceLoading] = useState(true);
  const [collectionSizes, setCollectionSizes] = useState<{ [key: string]: number }>({});
  const [thoughts, setThoughts] = useState<string[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageHistoryRef = useRef<Map<string, number>>(new Map());
  const lastSolPriceFetchTimestampRef = useRef<number | null>(null);
  const pingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionIdRef = useRef<string | null>(null);

  // Format timestamp
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  // Format thought message based on message type
  const formatThought = (message: WebSocketMessage): string | null => {
    // Skip ping messages
    if (message.type === 'ping') {
      return null;
    }
    
    const timestamp = formatTimestamp(message.timestamp);
    
    switch (message.type) {
      case WebSocketMessageType.CONNECTED:
        // Update connectionId from the server's response
        if (message.connectionId) {
          connectionIdRef.current = message.connectionId;
        }
        return `[${timestamp}] <connection>Connected to TRENCH thought process</connection>`;
      case WebSocketMessageType.TOKEN_CATEGORIZATION: {
        if (!message.data?.metadata?.name || !message.data.mint || !message.data.keywords) {
          console.error('Invalid token_categorization message:', message);
          return null;
        }
        const tokenName = message.data.metadata.name;
        const mint = message.data.mint;
        const keywords = message.data.keywords.join(', ');
        return `[${timestamp}] Token <token-link data-mint="${mint}">${tokenName}</token-link> categorized with keywords: <keywords>${keywords}</keywords>`;
      }
      case WebSocketMessageType.TOKEN_MIGRATION: {
        if (!message.data?.metadata?.name || !message.data.mint || !message.data.migration?.migratedAt) {
          console.error('Invalid token_migration message:', message);
          return null;
        }
        const tokenName = message.data.metadata.name;
        const mint = message.data.mint;
        const migratedAt = new Date(message.data.migration.migratedAt).toLocaleTimeString();
        return `[${timestamp}] Token <token-link data-mint="${mint}">${tokenName}</token-link> migrated at ${migratedAt}`;
      }
      case WebSocketMessageType.NEW_KEYWORD: {
        if (!message.data?.keyword) {
          console.error('Invalid new_keyword message:', message);
          return null;
        }
        return `[${timestamp}] New keyword detected: <keywords>${message.data.keyword}</keywords> - ${message.data.description || 'No description'}`;
      }
      case WebSocketMessageType.NEW_CALL: {
        if (!message.data?.metadata?.name || !message.data.mint || !message.data.username) {
          console.error('Invalid new_call message:', message);
          return null;
        }
        const tokenName = message.data.metadata.name;
        const mint = message.data.mint;
        const username = message.data.username;
        return `[${timestamp}] New call for <token-link data-mint="${mint}">${tokenName}</token-link> from ${username}`;
      }
      case WebSocketMessageType.ECHO:
        // Skip echo messages that contain ping data
        if (message.data?.type === 'ping') {
          return null;
        }
        return `[${timestamp}] ECHO: ${JSON.stringify(message.data)}`;
      default:
        return `[${timestamp}] Unknown message type: ${message.type}`;
    }
  };

  // Add a thought message, avoiding duplicates
  const addThought = (message: string | null) => {
    // Skip null messages (like pings)
    if (message === null) {
      return;
    }
    
    const now = Date.now();
    
    // Clean up old message history entries
    for (const [key, timestamp] of messageHistoryRef.current.entries()) {
      if (now - timestamp > DEDUP_WINDOW_MS) {
        messageHistoryRef.current.delete(key);
      }
    }

    // Create a fingerprint for the message
    let fingerprint = message;
    
    // Remove timestamp
    fingerprint = fingerprint.replace(/^\[\d{1,2}:\d{2}:\d{2}(?:\s[AP]M)?\]\s/, '');
    
    // For token categorization messages, create a fingerprint that only includes the token name
    if (fingerprint.includes('Token') && fingerprint.includes('categorized with keywords:')) {
      // Extract just the token name from the message
      const tokenMatch = fingerprint.match(/Token <token-link[^>]*>([^<]+)<\/token-link>/);
      if (tokenMatch) {
        const tokenName = tokenMatch[1];
        fingerprint = `Token ${tokenName} categorization`; // Simplified fingerprint for token categorization
      }
    }
    
    // Check if we've seen this message recently
    if (messageHistoryRef.current.has(fingerprint)) {
      const lastSeen = messageHistoryRef.current.get(fingerprint)!;
      if (now - lastSeen < DEDUP_WINDOW_MS) {
        return; // Skip if we've seen this message within the dedup window
      }
    }
    
    // Update message history
    messageHistoryRef.current.set(fingerprint, now);

    // Update thoughts state
    setThoughts(prev => {
      const updated = [...prev, message];
      return updated.slice(Math.max(0, updated.length - MAX_THOUGHTS));
    });
  };

  // Clear history and message deduplication on mount
  useEffect(() => {
    setThoughts([]);
    messageHistoryRef.current.clear();
    
    return () => {
      // Clean up all intervals and timeouts on unmount
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      if (pingTimeoutRef.current) {
        clearTimeout(pingTimeoutRef.current);
        pingTimeoutRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, []);
  
  // Setup heartbeat ping to keep connection alive
  const setupHeartbeat = (ws: WebSocket) => {
    // Clear any existing interval
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    // Set up interval to send heartbeat pings
    heartbeatIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        // Send a ping message
        try {
          console.debug(`Sending heartbeat ping (conn: ${connectionIdRef.current || 'unknown'})`);
          ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          
          // Set up a timeout to detect if we don't get a response
          if (pingTimeoutRef.current) {
            clearTimeout(pingTimeoutRef.current);
          }
          
          pingTimeoutRef.current = setTimeout(() => {
            console.warn('Ping timeout - no response received, assuming connection lost');
            // If no pong received after timeout, close and reconnect
            if (ws.readyState === WebSocket.OPEN) {
              ws.close(1000, 'Ping timeout');
            }
          }, PONG_TIMEOUT);
        } catch (error) {
          console.error('Error sending ping:', error);
        }
      }
    }, PING_INTERVAL);
  };

  // Connect WebSocket with exponential backoff
  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setWsStatus('connecting');

    // Clean up any existing timeouts or intervals
    if (pingTimeoutRef.current) {
      clearTimeout(pingTimeoutRef.current);
      pingTimeoutRef.current = null;
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    const ws = new WebSocket('wss://api.trench.digital/api/thought');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setWsStatus('connected');
      reconnectAttemptsRef.current = 0;
      
      // Setup heartbeat to keep connection alive
      setupHeartbeat(ws);
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        // Reset ping timeout on any message (including echo responses to our pings)
        if (pingTimeoutRef.current) {
          clearTimeout(pingTimeoutRef.current);
          pingTimeoutRef.current = null;
        }
        
        // Format and add the thought
        const thought = formatThought(message);
        if (thought !== null) {
          addThought(thought);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsStatus('disconnected');
    };

    ws.onclose = (event) => {
      console.log(`WebSocket closed: ${event.code} ${event.reason || 'No reason provided'}, clean: ${event.wasClean}`);
      setWsStatus('disconnected');
      
      // Special handling for code 1006 (abnormal closure)
      if (event.code === 1006) {
        console.warn('WebSocket abnormal closure (code 1006) - This usually indicates network issues or server timeout');
      }
      
      wsRef.current = null;
      connectionIdRef.current = null;

      // Clean up heartbeat and ping timeout
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      if (pingTimeoutRef.current) {
        clearTimeout(pingTimeoutRef.current);
        pingTimeoutRef.current = null;
      }

      // Clear any existing reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // For abnormal closures (like 1006), use a shorter initial delay
      const baseDelay = event.code === 1006 ? 500 : 1000;
      
      // Calculate exponential backoff delay with jitter to prevent thundering herd
      // Add random jitter of +/- 20% to prevent all clients reconnecting at the same time
      const jitter = 0.8 + (Math.random() * 0.4); // Random value between 0.8 and 1.2
      const backoffDelay = Math.min(
        baseDelay * Math.pow(1.5, reconnectAttemptsRef.current) * jitter, 
        30000
      );
      
      reconnectAttemptsRef.current++;

      console.log(`Scheduling reconnection attempt in ${Math.round(backoffDelay)}ms (attempt #${reconnectAttemptsRef.current})`);

      // Schedule reconnection attempt
      reconnectTimeoutRef.current = setTimeout(() => {
        if (apiStatus === 'online') {
          // Add a check to ensure we're still disconnected when the timeout fires
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            console.log(`Attempting to reconnect WebSocket (attempt #${reconnectAttemptsRef.current})`);
            connectWebSocket();
          }
        }
      }, backoffDelay);
    };
  };

  // Define the checkApiStatus function outside of useEffect so it can be reused
  const checkApiStatus = async () => {
    try {
      const response = await fetch('https://api.trench.digital/api/health');
      const data = await response.json();
      const isOnline = data.status === 'ok';
      setApiStatus(isOnline ? 'online' : 'offline');

      // Update collection sizes from health response
      if (isOnline && data.collections) {
        setCollectionSizes(data.collections);
      }

      if (isOnline && (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)) {
        connectWebSocket();
      }
      
      return isOnline;
    } catch (error) {
      console.error('Error checking API status:', error);
      setApiStatus('offline');
      return false;
    }
  };

  // Periodically check API status
  useEffect(() => {
    checkApiStatus();
    
    // Set interval to check API status every 60 seconds
    const interval = setInterval(checkApiStatus, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Fetch SOL price
  useEffect(() => {
    const SOL_PRICE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

    const fetchSolPrice = async () => {
      // Check if we need to fetch based on TTL
      const now = Date.now();
      if (lastSolPriceFetchTimestampRef.current && now - lastSolPriceFetchTimestampRef.current < SOL_PRICE_TTL) {
        return; // Skip fetch if within TTL period
      }

      setSolPriceLoading(true);
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true');
        const data = await response.json();
        setSolPrice(data.solana.usd);
        setSolPriceChange(data.solana.usd_24h_change);
        lastSolPriceFetchTimestampRef.current = now;
      } catch (error) {
        console.error('Error fetching SOL price:', error);
        setSolPrice(0.00);
        setSolPriceChange(0.00);
      } finally {
        setSolPriceLoading(false);
      }
    };

    // Initial fetch
    fetchSolPrice();

    // Set up interval to check if we need to fetch again (every minute)
    const interval = setInterval(fetchSolPrice, 60000);

    return () => clearInterval(interval);
  }, []);

  const value = {
    apiStatus,
    wsStatus,
    solPrice,
    solPriceChange,
    solPriceLoading,
    collectionSizes,
    reconnectWebSocket: () => {
      if (apiStatus === 'online') {
        connectWebSocket();
      }
    },
    thoughts,
    checkApiHealth: checkApiStatus,
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup WebSocket resources on unmount
      if (wsRef.current) {
        try {
          wsRef.current.close(1000, "Component unmounting");
        } catch (err) {
          console.error("Error closing WebSocket connection:", err);
        }
        wsRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      if (pingTimeoutRef.current) {
        clearTimeout(pingTimeoutRef.current);
        pingTimeoutRef.current = null;
      }
    };
  }, []);

  return (
    <GlobalStateContext.Provider value={value}>
      {children}
    </GlobalStateContext.Provider>
  );
}

export function useGlobalState() {
  const context = useContext(GlobalStateContext);
  if (context === undefined) {
    throw new Error('useGlobalState must be used within a GlobalStateProvider');
  }
  return context;
} 