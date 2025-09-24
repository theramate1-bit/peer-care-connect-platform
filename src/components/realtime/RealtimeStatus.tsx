import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useRealtimePresence } from '@/hooks/use-realtime';
import { useAuth } from '@/contexts/AuthContext';

interface RealtimeStatusProps {
  showOnlineUsers?: boolean;
  className?: string;
}

export const RealtimeStatus: React.FC<RealtimeStatusProps> = ({
  showOnlineUsers = false,
  className = ''
}) => {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');
  const { onlineUsers } = useRealtimePresence('global-presence', user?.id);

  useEffect(() => {
    // Monitor connection status
    const handleOnline = () => setConnectionStatus('connected');
    const handleOffline = () => setConnectionStatus('disconnected');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial connection status
    setConnectionStatus(navigator.onLine ? 'connected' : 'disconnected');

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-3 w-3" />;
      case 'disconnected':
        return <WifiOff className="h-3 w-3" />;
      case 'reconnecting':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Wifi className="h-3 w-3" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-500 text-white';
      case 'disconnected':
        return 'bg-red-500 text-white';
      case 'reconnecting':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Live';
      case 'disconnected':
        return 'Offline';
      case 'reconnecting':
        return 'Reconnecting...';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant="secondary" className={`${getStatusColor()} flex items-center gap-1`}>
        {getStatusIcon()}
        <span className="text-xs">{getStatusText()}</span>
      </Badge>
      
      {showOnlineUsers && connectionStatus === 'connected' && (
        <Badge variant="outline" className="text-xs">
          {onlineUsers} online
        </Badge>
      )}
    </div>
  );
};
