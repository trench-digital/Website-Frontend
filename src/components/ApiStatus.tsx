'use client';

import { useGlobalState } from '@/context/GlobalStateContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync } from '@fortawesome/free-solid-svg-icons';

export default function ApiStatus() {
  const { apiStatus, wsStatus, reconnectWebSocket, checkApiHealth } = useGlobalState();

  // Determine the overall status
  const isFullyOnline = apiStatus === 'online' && wsStatus === 'connected';
  const isLoading = wsStatus === 'connecting';
  
  // Get the appropriate status text and color
  const getStatusText = () => {
    if (isFullyOnline) return 'ONLINE';
    if (isLoading) return 'CONNECTING';
    return 'OFFLINE';
  };
  
  const getStatusColor = () => {
    if (isFullyOnline) return 'bg-[var(--pip-glow-green)]';
    if (isLoading) return 'bg-yellow-400 animate-pulse';
    return 'bg-red-500';
  };

  const handleReconnect = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // First check API health
    const isOnline = await checkApiHealth();
    
    // Only reconnect WebSocket if API is online
    if (isOnline) {
      reconnectWebSocket();
    }
  };

  return (
    <div className="flex items-center gap-1 text-[var(--pip-glow-green)] whitespace-nowrap">
      <div 
        className={`w-2 h-2 rounded-full ${getStatusColor()}`}
      />
      <span className="text-xs font-bold">STATUS: {getStatusText()}</span>
      
      {/* Show reconnect button when offline */}
      {!isFullyOnline && !isLoading && (
        <button 
          onClick={handleReconnect}
          className="ml-2 text-xs hover:text-white transition-colors duration-200"
          title="Reconnect"
        >
          <FontAwesomeIcon icon={faSync} className="animate-pulse" />
        </button>
      )}
    </div>
  );
} 