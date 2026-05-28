import { supabase } from '@/integrations/supabase/client';

export type AnalyticsEventName =
  | 'cta_browse_therapists_click'
  | 'cta_get_started_click'
  | 'portal_select_client'
  | 'portal_select_professional'
  | 'profile_view'
  | 'profile_book_click'
  | 'profile_share'
  | 'marketplace_filter_applied'
  | 'marketplace_booking_start'
  | 'onboarding_services_selected';

export class Analytics {
  static async trackEvent(
    name: AnalyticsEventName,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Push to GTM dataLayer if available
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const w = window as any;
        w.dataLayer = w.dataLayer || [];
        w.dataLayer.push({ event: name, ...(metadata || {}) });
      } catch {}

      // Try best-effort insert; ignore if table doesn't exist
      const { error } = await supabase
        .from('analytics_events')
        .insert({
          event_type: 'user_action', // Event type for categorization
          event_name: name,
          metadata: metadata ?? {},
          properties: metadata ?? {}, // Also store in properties for backwards compatibility
        });
      if (error && !(`${error.message}` || '').includes('does not exist')) {
        // Log but don't throw to avoid UX impact
        console.warn('Analytics insert error:', error.message);
      }
    } catch (err) {
      console.warn('Analytics error:', err);
    }
  }
}


