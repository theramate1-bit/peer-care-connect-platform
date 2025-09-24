# Live Chat Setup Guide

This guide will help you set up the Tawk.to live chat widget in your Theramate application.

## Step 1: Create Tawk.to Account

1. Go to [https://www.tawk.to](https://www.tawk.to)
2. Click "Sign Up" and create a free account
3. Verify your email address

## Step 2: Create a New Site

1. Log into your Tawk.to dashboard
2. Click "Add New Site"
3. Enter your site details:
   - **Site Name**: Theramate
   - **Website URL**: Your production URL (e.g., https://theramate.com)
   - **Category**: Healthcare/Medical Services

## Step 3: Get Your Widget ID

1. After creating the site, you'll see your **Widget ID**
2. It looks like: `5a8b8c9d4b8c9d4b8c9d4b8c`
3. Copy this Widget ID

## Step 4: Configure the Widget

1. In your Tawk.to dashboard, go to "Administration" → "Channels" → "Chat Widget"
2. Customize the widget appearance:
   - **Primary Color**: #3b82f6 (Your brand blue)
   - **Secondary Color**: #10b981 (Your brand green)
   - **Position**: Bottom Right
   - **Size**: Medium

## Step 5: Update Your Configuration

1. Open `src/lib/live-chat-config.ts`
2. Replace `YOUR_WIDGET_ID` with your actual Widget ID:

```typescript
export const LIVE_CHAT_CONFIG = {
  WIDGET_ID: '5a8b8c9d4b8c9d4b8c9d4b8c', // Your actual widget ID
  // ... rest of config
};
```

## Step 6: Test the Integration

1. Start your development server: `npm run dev`
2. Open your app in the browser
3. You should see the Tawk.to chat widget in the bottom-right corner
4. Click on it to test the chat functionality

## Step 7: Customize Further (Optional)

### Business Hours
If you want to set business hours, update the config:

```typescript
businessHours: {
  enabled: true,
  timezone: 'Europe/London',
  hours: {
    monday: { start: '09:00', end: '17:00' },
    tuesday: { start: '09:00', end: '17:00' },
    // ... etc
  }
}
```

### Pre-chat Form
In your Tawk.to dashboard:
1. Go to "Administration" → "Channels" → "Chat Widget"
2. Enable "Pre-chat Form"
3. Add fields like:
   - Name (required)
   - Email (required)
   - User Type (Client/Practitioner)

## Step 8: Deploy to Production

1. Make sure your Widget ID is correctly set in the config
2. Deploy your app to production
3. Test the live chat on your production site
4. Set up notifications in Tawk.to dashboard

## Features Included

- ✅ Free forever (unlimited agents and chats)
- ✅ Real-time visitor monitoring
- ✅ Mobile responsive
- ✅ Customizable appearance
- ✅ File sharing
- ✅ Offline messaging
- ✅ Analytics dashboard
- ✅ Multi-language support

## Troubleshooting

### Widget Not Appearing
- Check that your Widget ID is correct
- Ensure `shouldShowLiveChat()` returns `true`
- Check browser console for errors

### Widget Not Loading
- Verify your internet connection
- Check if Tawk.to is blocked by ad blockers
- Try refreshing the page

### Styling Issues
- Customize colors in Tawk.to dashboard
- Check for CSS conflicts in your app

## Support

- Tawk.to Documentation: [https://www.tawk.to/knowledgebase/](https://www.tawk.to/knowledgebase/)
- Tawk.to Support: Available through their dashboard

---

**Note**: The live chat widget is now integrated into your app and will appear on all pages. Make sure to replace the placeholder Widget ID with your actual Tawk.to Widget ID before going live.
