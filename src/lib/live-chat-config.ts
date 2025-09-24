// Live Chat Configuration
// Replace 'YOUR_WIDGET_ID' with your actual Tawk.to widget ID

export const LIVE_CHAT_CONFIG = {
  // Your Tawk.to widget ID - get this from your Tawk.to dashboard
  WIDGET_ID: '68c3439767c586192c674abd',
  WIDGET_PATH: '68c3439767c586192c674abd/1j4tc020j',
  
  // Customization options
  CUSTOMIZATION: {
    // Set to true to show the chat widget
    enabled: true, // Re-enabled live chat widget
    
    // Set to true to show fallback contact form when blocked
    showFallback: false,
    
    // Position of the chat widget
    position: 'bottom-right',
    
    // Custom colors to match your brand
    colors: {
      primary: '#3b82f6', // Your primary blue
      secondary: '#10b981', // Your secondary green
    },
    
    // Sound settings
    sound: {
      enabled: false, // Disable all notification sounds
      newMessageSound: false,
      typingSound: false,
      notificationSound: false
    },
    
    // AI Features
    ai: {
      apolloBot: {
        enabled: true, // Enable Apollo AI Bot for 24/7 responses
        knowledgeBase: true, // Use your knowledge base
        websiteContent: true, // Use website content
        customData: true // Use custom data
      },
      smartReply: {
        enabled: true, // Enable AI-generated suggestions
        tone: 'professional', // Response tone
        commands: ['brainstorm', 'tone', 'fix', 'summarize'] // Available AI commands
      }
    },
    
    // Business hours (optional)
    businessHours: {
      enabled: false,
      timezone: 'Europe/London',
      // Add your business hours here if needed
    }
  }
};

// Helper function to check if live chat should be enabled
export const shouldShowLiveChat = (): boolean => {
  return LIVE_CHAT_CONFIG.CUSTOMIZATION.enabled && 
         LIVE_CHAT_CONFIG.WIDGET_ID !== 'YOUR_WIDGET_ID';
};
