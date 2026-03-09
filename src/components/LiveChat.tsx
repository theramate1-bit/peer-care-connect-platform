import { useEffect, useState } from 'react';
import { LIVE_CHAT_CONFIG, shouldShowLiveChat } from '@/lib/live-chat-config';

interface LiveChatProps {
  widgetId?: string;
}

const LiveChat = ({ widgetId }: LiveChatProps) => {
  const actualWidgetId = widgetId || LIVE_CHAT_CONFIG.WIDGET_PATH;
  const [isBlocked, setIsBlocked] = useState(false);
  
  useEffect(() => {
    // Don't load if live chat is disabled or widget ID is not set
    if (!shouldShowLiveChat()) {
      return;
    }

    // Check if Tawk.to is already loaded
    if (window.Tawk_API) {
      return;
    }

    // Load directly from Tawk (CSP allows embed.tawk.to in script-src; proxy caused 403 and wrong MIME type)
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://embed.tawk.to/${actualWidgetId}?disableAnalytics=true&disablePerformanceLogging=true`;
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');
    
    // Add error handling for blocked scripts
      script.onerror = () => {
        console.warn('Tawk.to widget blocked by ad blocker or browser extension. Live chat will not be available.');
        setIsBlocked(true);
        // Don't show fallback message if chat is working
        if (window.Tawk_API && typeof window.Tawk_API.isLoaded === 'function' && window.Tawk_API.isLoaded()) {
          setIsBlocked(false);
        }
      };
    
    script.onload = () => {
      setIsBlocked(false); // Clear blocked state on successful load
    };
    
    // Add the script to the document
    document.body.appendChild(script);

    // Set a timeout to check if Tawk.to loaded successfully
    const loadTimeout = setTimeout(() => {
      // Only set as blocked if we're sure it's not working
      if (!window.Tawk_API || (typeof window.Tawk_API.isLoaded === 'function' && !window.Tawk_API.isLoaded())) {
        console.warn('Tawk.to widget failed to load within timeout period. Live chat may be blocked.');
        // Only set blocked if we're absolutely sure it's not working
        if (!window.Tawk_API) {
          setIsBlocked(true);
        }
      }
    }, 20000); // Increased to 20 seconds for better detection

    // Initialize Tawk.to API
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();
    
    // Disable Tawk.to performance logging before it loads
    window.Tawk_API.disablePerformanceLogging = true;
    window.Tawk_API.performanceLogging = false;
    window.Tawk_API.analytics = false;
    
    // Clear blocked state if Tawk.to is already available
    if (window.Tawk_API && window.Tawk_API.isLoaded) {
      setIsBlocked(false);
    }
    
    // TEMPORARILY DISABLED: Console error override causing issues
    // const originalConsoleError = console.error;
    // console.error = function(...args) {
    //   // Check if this is a Tawk.to performance logging error
    //   const errorMessage = args.join(' ');
    //   if (errorMessage.includes('va.tawk.to/log-performance') || 
    //       errorMessage.includes('ERR_BLOCKED_BY_CLIENT') ||
    //       errorMessage.includes('twk-chunk-common.js')) {
    //     // Suppress Tawk.to performance logging errors - they don't affect functionality
    //     console.log('🔧 Tawk.to performance logging blocked by ad blocker (chat still works)');
    //     return;
    //   }
    //   // Log other errors normally
    //   originalConsoleError.apply(console, args);
    // };
    
    // Configure Tawk.to settings with lower z-index to not block modals
    window.Tawk_API.customStyle = {
      zIndex: 40,
      visibility: {
        desktop: {
          position: 'br', // bottom-right
          xOffset: 16,
          yOffset: 16,
        },
        mobile: {
          position: 'br',
          xOffset: 12,
          yOffset: 12,
        }
      }
    };

    // Consolidated onLoad handler - handles all widget configurations
    window.Tawk_API.onLoad = function() {
      // Build attributes object with all configurations
      const attributes: any = {
        widgetSize: 'compact',
        widgetPosition: 'br',
        widgetOffset: {
          x: 16,
          y: 16
        }
      };

      // Disable notification sounds based on config
      if (!LIVE_CHAT_CONFIG.CUSTOMIZATION.sound.enabled) {
        attributes.disableSound = true;
        attributes.soundEnabled = false;
      }

      // Configure AI features
      if (LIVE_CHAT_CONFIG.CUSTOMIZATION.ai.apolloBot.enabled) {
        attributes.enableAI = true;
        attributes.aiBot = true;
        attributes.knowledgeBase = LIVE_CHAT_CONFIG.CUSTOMIZATION.ai.apolloBot.knowledgeBase;
        attributes.websiteContent = LIVE_CHAT_CONFIG.CUSTOMIZATION.ai.apolloBot.websiteContent;
        attributes.customData = LIVE_CHAT_CONFIG.CUSTOMIZATION.ai.apolloBot.customData;
      }

      // Configure Smart Reply
      if (LIVE_CHAT_CONFIG.CUSTOMIZATION.ai.smartReply.enabled) {
        attributes.smartReply = true;
        attributes.aiSuggestions = true;
        attributes.responseTone = LIVE_CHAT_CONFIG.CUSTOMIZATION.ai.smartReply.tone;
        attributes.aiCommands = LIVE_CHAT_CONFIG.CUSTOMIZATION.ai.smartReply.commands;
      }

      // Apply all attributes at once
      if (window.Tawk_API && window.Tawk_API.setAttributes) {
        window.Tawk_API.setAttributes(attributes);
      }
      
      // Apply custom CSS to make widget smaller and more compact
      const style = document.createElement('style');
      style.id = 'tawk-compact-styles';
      style.textContent = `
        /* Base Tawk widget styles */
        #tawkchat-container {
          z-index: 40 !important;
        }
        
        #tawkchat-container .tawk-button {
          width: 48px !important;
          height: 48px !important;
          bottom: 16px !important;
          right: 16px !important;
          z-index: 40 !important;
        }
        
        #tawkchat-container iframe {
          bottom: 72px !important;
          right: 16px !important;
          max-width: 380px !important;
          max-height: calc(100vh - 100px) !important;
          z-index: 40 !important;
        }
        
        /* Hide Tawk widget when modals/dialogs are open */
        body:has([role="dialog"]:not([hidden])) #tawkchat-container,
        body:has([data-radix-dialog-overlay]) #tawkchat-container,
        body:has(.booking-modal) #tawkchat-container,
        body:has([data-state="open"][role="dialog"]) #tawkchat-container {
          display: none !important;
        }
        
        @media (max-width: 768px) {
          #tawkchat-container .tawk-button {
            width: 44px !important;
            height: 44px !important;
            bottom: 12px !important;
            right: 12px !important;
          }
          #tawkchat-container iframe {
            bottom: 64px !important;
            right: 12px !important;
            max-width: calc(100vw - 24px) !important;
            max-height: calc(100vh - 80px) !important;
          }
        }
      `;
      // Only add style if it doesn't already exist
      if (!document.getElementById('tawk-compact-styles')) {
        document.head.appendChild(style);
      }
    };
    
    // Disable Tawk.to performance logging to prevent blocked requests
    window.Tawk_API.disablePerformanceLogging = true;
    window.Tawk_API.performanceLogging = false;

    // TEMPORARILY DISABLED: Global error handler causing issues
    // const handleGlobalError = (event: ErrorEvent) => {
    //   if (event.message && (
    //     event.message.includes('va.tawk.to/log-performance') ||
    //     event.message.includes('ERR_BLOCKED_BY_CLIENT') ||
    //     event.message.includes('twk-chunk-common.js')
    //   )) {
    //     // Prevent the error from showing in console
    //     event.preventDefault();
    //     console.log('🔧 Tawk.to performance logging blocked by ad blocker (chat still works)');
    //     return false;
    //   }
    // };
    
    // window.addEventListener('error', handleGlobalError);
    
    // Cleanup function
    return () => {
      clearTimeout(loadTimeout);
      // window.removeEventListener('error', handleGlobalError); // DISABLED
      const existingScript = document.querySelector('script[src*="tawk"]');
      if (existingScript) {
        existingScript.remove();
      }
      
      // Reset Tawk.to API
      if (window.Tawk_API) {
        window.Tawk_API = undefined;
      }
    };
  }, [actualWidgetId]);

  // Show fallback contact form if Tawk.to is blocked
  if (isBlocked && LIVE_CHAT_CONFIG.CUSTOMIZATION.showFallback) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-900">Need Help?</h3>
            <button 
              onClick={() => setIsBlocked(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            Live chat is blocked by your browser. You can still contact us:
          </p>
          <div className="space-y-2">
            <a 
              href="/contact" 
              className="block w-full text-center bg-blue-600 text-white text-xs py-2 px-3 rounded hover:bg-blue-700 transition-colors"
            >
              Contact Form
            </a>
            <a 
              href="mailto:support@theramate.com" 
              className="block w-full text-center bg-gray-100 text-gray-700 text-xs py-2 px-3 rounded hover:bg-gray-200 transition-colors"
            >
              Email Support
            </a>
          </div>
        </div>
      </div>
    );
  }

  // This component doesn't render anything visible when Tawk.to loads successfully
  return null;
};

// Extend the Window interface to include Tawk.to types
declare global {
  interface Window {
    Tawk_API: any;
    Tawk_LoadStart: Date;
  }
}

export default LiveChat;
