import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { GoogleCalendarService } from '@/lib/google-calendar-service';

export default function GoogleCalendarCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code');

  useEffect(() => {
    const handleCallback = async () => {
      if (!code) {
        navigate('/profile#services', { replace: true });
        return;
      }

      try {
        // Exchange code for tokens
        await GoogleCalendarService.exchangeCode(code);
        
        // Notify parent window (if opened in popup)
        if (window.opener) {
          window.opener.postMessage(
            { type: 'google-calendar-connected', code },
            window.location.origin
          );
          window.close();
        } else {
          // Regular redirect - navigate back to profile
          navigate('/profile#services', { replace: true });
        }
      } catch (error) {
        console.error('Error handling Google Calendar callback:', error);
        
        if (window.opener) {
          window.opener.postMessage(
            { type: 'google-calendar-error', error: error instanceof Error ? error.message : 'Unknown error' },
            window.location.origin
          );
          window.close();
        } else {
          navigate('/profile#services', { 
            replace: true,
            state: { error: 'Failed to connect Google Calendar' }
          });
        }
      }
    };

    handleCallback();
  }, [code, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Connecting your Google Calendar...</p>
      </div>
    </div>
  );
}

