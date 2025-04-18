export interface WebSocketMessage {
  type: 'connected' | 'token_categorization' | 'token_migration' | 'new_keyword' | 'new_call' | 'echo' | 'ping';
  timestamp: number;
  connectionId?: string;
  data: {
    type?: string;
    metadata?: {
      name: string;
    };
    mint?: string;
    keywords?: string[];
    migration?: {
      migratedAt: string;
    };
    keyword?: string;
    description?: string;
    username?: string;
  } | null;
} 