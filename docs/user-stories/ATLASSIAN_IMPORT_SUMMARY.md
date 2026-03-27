# Atlassian Import Summary - User Stories

## Overview

This document contains three user stories ready for import into Atlassian Jira/Confluence:

1. **Address Validation & Pre-population in Onboarding**
2. **Stripe Connect Onboarding Optimization**
3. **Advanced Analytics & Insights for Pro Tier**

## Story 1: Address Validation & Pre-population

### Summary

Implement address validation and pre-population in the onboarding flow to improve user experience and data quality.

### Key Details

- **Type:** Feature Enhancement
- **Epic:** Onboarding Experience Improvement
- **Priority:** Medium-High
- **Story Points:** 8
- **Status:** Ready for Backlog

### Full Story Location

`docs/user-stories/address-validation-onboarding.md`

### Quick Import Format (Jira)

```
**Title:** Address Validation & Pre-population in Onboarding

**Description:**
As a practitioner or client during onboarding
I want my address to be validated and automatically pre-populated
So that I can complete the onboarding process faster with accurate address information

**Acceptance Criteria:**
- Address input fields validate against official postal databases (UK Royal Mail Postcode Address File)
- Browser geolocation API is used to suggest user's current location (with permission)
- Address fields are structured (street, city, county, postcode) and auto-filled from selection
- Clear visual feedback when address is validated
- Option to manually enter address if autocomplete doesn't find it

**Technical Notes:**
- Requires third-party service (recommended: Loqate for UK, Google Places API for global)
- Current implementation uses free OpenStreetMap services (Photon, Nominatim)
- Need to add structured address fields to database schema
- Estimated implementation: 2-3 sprints

**Story Points:** 8
**Priority:** Medium-High
```

---

## Story 2: Stripe Connect Onboarding Optimization

### Summary

Optimize the Stripe Connect payment setup process to reduce completion time and improve user experience.

### Key Details

- **Type:** Performance & UX Improvement
- **Epic:** Onboarding Experience Improvement
- **Priority:** High
- **Story Points:** 13
- **Status:** Ready for Backlog

### Full Story Location

`docs/user-stories/stripe-connect-onboarding-optimization.md`

### Quick Import Format (Jira)

```
**Title:** Optimize Stripe Connect Onboarding Experience

**Description:**
As a practitioner during onboarding
I want the Stripe Connect payment setup to be faster and more streamlined
So that I can complete onboarding quickly without unnecessary delays or confusion

**Problem:**
The current Stripe Connect onboarding process is taking too long:
- Multiple loading states and checks
- Polling every 2 seconds for completion status
- Users waiting for account creation API calls (2-5 seconds)
- Embedded component initialization delays (1-2 seconds)
- No clear progress indication
- Total onboarding time: 5-10 minutes

**Acceptance Criteria:**
- Account creation API call completes in < 2 seconds
- Embedded component loads in < 1 second
- Completion detection happens within 5 seconds of user finishing
- Clear progress indicators showing current step
- Pre-fill user information from profile
- Reduce API calls from 20-30 to < 10 per onboarding

**Technical Notes:**
- Optimize Edge Function response times
- Implement smart polling or real-time updates (WebSocket/SSE)
- Add progress tracking table to database
- Pre-populate Stripe form with user data
- Implement exponential backoff retry logic

**Story Points:** 13
**Priority:** High
```

---

## Story 3: Advanced Analytics & Insights for Pro Tier

### Summary

Implement comprehensive analytics and insights dashboard for Pro tier practitioners to justify subscription cost and provide data-driven decision making.

### Key Details

- **Type:** Feature Development
- **Epic:** Pro Tier Feature Enhancement
- **Priority:** High
- **Story Points:** 21
- **Status:** Ready for Backlog

### Full Story Location

`docs/user-stories/pro-analytics-insights.md`

### Quick Import Format (Jira)

```
**Title:** Advanced Analytics & Insights for Pro Tier

**Description:**
As a Pro tier practitioner
I want comprehensive analytics and insights about my practice
So that I can make data-driven decisions to grow my practice, understand client behavior, and optimize my business performance

**Problem:**
Pro plan is advertised with "Advanced analytics & insights" but current implementation is basic. Pro users expect premium analytics that justify £50/month subscription.

**Acceptance Criteria:**
- Revenue analytics: trends, forecasting, breakdowns by service/client
- Client insights: retention rate, lifetime value, segmentation, top clients
- Performance metrics: utilization rate, conversion rates, growth metrics
- Comparative analytics: period-over-period, year-over-year comparisons
- Advanced visualizations: interactive charts, heatmaps, funnels
- Export functionality: CSV/PDF export, scheduled reports
- Actionable insights: AI-powered recommendations, alerts, goal tracking
- Pro-only gating with upgrade prompts for Starter tier

**Technical Notes:**
- Create materialized views for analytics aggregation
- Build ProAnalyticsService with comprehensive methods
- Implement ProAnalyticsGate component for feature gating
- Use charting library (Recharts/Chart.js) for visualizations
- Add caching for performance
- Estimated implementation: 6 sprints

**Story Points:** 21
**Priority:** High
```

---

## Import Instructions

### For Jira

1. Create three new stories in your Jira backlog
2. Copy the "Quick Import Format" content for each story
3. Add labels:
   - Stories 1 & 2: `onboarding`, `ux-improvement`
   - Story 3: `pro-tier`, `analytics`, `feature-development`
4. Link stories to appropriate Epics:
   - Stories 1 & 2: "Onboarding Experience Improvement"
   - Story 3: "Pro Tier Feature Enhancement"
5. Set appropriate sprint based on priority

### For Confluence

1. Create pages for user stories:
   - "Onboarding User Stories" (for stories 1 & 2)
   - "Pro Tier Features" (for story 3)
2. Import the full markdown files from:
   - `docs/user-stories/address-validation-onboarding.md`
   - `docs/user-stories/stripe-connect-onboarding-optimization.md`
   - `docs/user-stories/pro-analytics-insights.md`
3. Link to Jira tickets if created

### Manual Copy-Paste

Both stories are in markdown format and can be:

- Copied directly into Jira description fields
- Imported into Confluence pages
- Used as reference for sprint planning

---

## Related Files

- `docs/user-stories/address-validation-onboarding.md` - Full address validation story
- `docs/user-stories/stripe-connect-onboarding-optimization.md` - Full Stripe optimization story
- `docs/user-stories/pro-analytics-insights.md` - Full Pro analytics story
- `docs/user-stories/ATLASSIAN_IMPORT_SUMMARY.md` - This file

---

**Created:** 2025-01-27  
**Ready for Import:** Yes
