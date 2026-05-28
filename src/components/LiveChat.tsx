import { useEffect, useState } from 'react';
import { LIVE_CHAT_CONFIG, shouldShowLiveChat } from '@/lib/live-chat-config';
import {
  TM_COOKIE_CONSENT_CHANGED_EVENT,
  readStoredCookieConsent,
} from '@/lib/analytics/cookieConsentStorage';

interface LiveChatProps {
  widgetId?: string;
}

const LiveChat = ({ widgetId }: LiveChatProps) => {
  const actualWidgetId = widgetId || LIVE_CHAT_CONFIG.WIDGET_PATH;
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    if (!shouldShowLiveChat()) {
      return;
    }

    let loadTimeout: ReturnType<typeof setTimeout> | undefined;

    const initTawk = () => {
      if (!readStoredCookieConsent()?.functional) {
        return;
      }

      if (document.querySelector('script[src*="embed.tawk.to"]')) {
        return;
      }

      if (
        window.Tawk_API &&
        typeof window.Tawk_API.isLoaded === 'function' &&
        window.Tawk_API.isLoaded()
      ) {
        return;
      }

      const script = document.createElement('script');
      script.async = true;
      script.src = `https://embed.tawk.to/${actualWidgetId}?disableAnalytics=true&disablePerformanceLogging=true`;
      script.charset = 'UTF-8';
      script.setAttribute('crossorigin', '*');

      script.onerror = () => {
        console.warn(
          'Tawk.to widget blocked by ad blocker or browser extension. Live chat will not be available.',
        );
        setIsBlocked(true);
        if (
          window.Tawk_API &&
          typeof window.Tawk_API.isLoaded === 'function' &&
          window.Tawk_API.isLoaded()
        ) {
          setIsBlocked(false);
        }
      };

      script.onload = () => {
        setIsBlocked(false);
      };

      document.body.appendChild(script);

      loadTimeout = setTimeout(() => {
        if (
          !window.Tawk_API ||
          (typeof window.Tawk_API.isLoaded === 'function' &&
            !window.Tawk_API.isLoaded())
        ) {
          console.warn(
            'Tawk.to widget failed to load within timeout period. Live chat may be blocked.',
          );
          if (!window.Tawk_API) {
            setIsBlocked(true);
          }
        }
      }, 20000);

      window.Tawk_API = window.Tawk_API || {};
      window.Tawk_LoadStart = new Date();

      window.Tawk_API.disablePerformanceLogging = true;
      window.Tawk_API.performanceLogging = false;
      window.Tawk_API.analytics = false;

      if (window.Tawk_API && window.Tawk_API.isLoaded) {
        setIsBlocked(false);
      }

      window.Tawk_API.customStyle = {
        zIndex: 40,
        visibility: {
          desktop: {
            position: 'br',
            xOffset: 16,
            yOffset: 16,
          },
          mobile: {
            position: 'br',
            xOffset: 12,
            yOffset: 12,
          },
        },
      };

      window.Tawk_API.onLoad = function () {
        const attributes: Record<string, unknown> = {
          widgetSize: 'compact',
          widgetPosition: 'br',
          widgetOffset: {
            x: 16,
            y: 16,
          },
        };

        if (!LIVE_CHAT_CONFIG.CUSTOMIZATION.sound.enabled) {
          attributes.disableSound = true;
          attributes.soundEnabled = false;
        }

        if (LIVE_CHAT_CONFIG.CUSTOMIZATION.ai.apolloBot.enabled) {
          attributes.enableAI = true;
          attributes.aiBot = true;
          attributes.knowledgeBase =
            LIVE_CHAT_CONFIG.CUSTOMIZATION.ai.apolloBot.knowledgeBase;
          attributes.websiteContent =
            LIVE_CHAT_CONFIG.CUSTOMIZATION.ai.apolloBot.websiteContent;
          attributes.customData =
            LIVE_CHAT_CONFIG.CUSTOMIZATION.ai.apolloBot.customData;
        }

        if (LIVE_CHAT_CONFIG.CUSTOMIZATION.ai.smartReply.enabled) {
          attributes.smartReply = true;
          attributes.aiSuggestions = true;
          attributes.responseTone =
            LIVE_CHAT_CONFIG.CUSTOMIZATION.ai.smartReply.tone;
          attributes.aiCommands =
            LIVE_CHAT_CONFIG.CUSTOMIZATION.ai.smartReply.commands;
        }

        if (window.Tawk_API && window.Tawk_API.setAttributes) {
          window.Tawk_API.setAttributes(attributes);
        }

        const style = document.createElement('style');
        style.id = 'tawk-compact-styles';
        style.textContent = `
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
        if (!document.getElementById('tawk-compact-styles')) {
          document.head.appendChild(style);
        }
      };

      window.Tawk_API.disablePerformanceLogging = true;
      window.Tawk_API.performanceLogging = false;
    };

    initTawk();

    const onConsent = () => initTawk();
    window.addEventListener(TM_COOKIE_CONSENT_CHANGED_EVENT, onConsent);

    return () => {
      window.removeEventListener(TM_COOKIE_CONSENT_CHANGED_EVENT, onConsent);
      if (loadTimeout) clearTimeout(loadTimeout);
      const existingScript = document.querySelector('script[src*="tawk"]');
      if (existingScript) {
        existingScript.remove();
      }

      if (window.Tawk_API) {
        window.Tawk_API = undefined;
      }
    };
  }, [actualWidgetId]);

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
              href="mailto:support@theramate.co.uk"
              className="block w-full text-center bg-gray-100 text-gray-700 text-xs py-2 px-3 rounded hover:bg-gray-200 transition-colors"
            >
              Email Support
            </a>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

declare global {
  interface Window {
    Tawk_API: any;
    Tawk_LoadStart: Date;
  }
}

export default LiveChat;
