# User Story: Advanced Analytics & Insights for Pro Tier

## Story Type

**Feature Development**

## Epic

**Pro Tier Feature Enhancement**

## User Story

**As a** Pro tier practitioner  
**I want** comprehensive analytics and insights about my practice  
**So that** I can make data-driven decisions to grow my practice, understand client behavior, and optimize my business performance

## Problem Statement

Currently, the Pro plan is advertised with "Advanced analytics & insights" as a key feature, but:

- Basic analytics dashboard exists but lacks advanced features
- No revenue forecasting or trend analysis
- Limited client insights (no retention, lifetime value, segmentation)
- No comparative analytics (period-over-period, benchmarks)
- No export capabilities for reporting
- Missing actionable insights and recommendations
- No custom date range filtering beyond basic options

Pro tier users expect premium analytics that justify the £50/month subscription cost.

## Acceptance Criteria

### Core Analytics Features

- [ ] **Revenue Analytics**
  - [ ] Revenue trends over time (daily, weekly, monthly, yearly)
  - [ ] Revenue breakdown by service type, client, payment method
  - [ ] Revenue forecasting (next 30/60/90 days)
  - [ ] Average session value and trends
  - [ ] Revenue vs. expenses (if expense tracking added)
  - [ ] Profit margin analysis

- [ ] **Client Insights**
  - [ ] Client retention rate and cohort analysis
  - [ ] Client lifetime value (CLV) calculation
  - [ ] New vs. returning client trends
  - [ ] Client segmentation (by frequency, value, recency)
  - [ ] Top clients by revenue and sessions
  - [ ] Client acquisition cost (if marketing data available)

- [ ] **Performance Metrics**
  - [ ] Session utilization rate (booked vs. available slots)
  - [ ] Average sessions per client
  - [ ] No-show and cancellation rates
  - [ ] Response time to booking requests
  - [ ] Booking conversion rate
  - [ ] Practice growth metrics (MoM, YoY)

- [ ] **Comparative Analytics**
  - [ ] Period-over-period comparisons (this month vs. last month)
  - [ ] Year-over-year comparisons
  - [ ] Best/worst performing periods
  - [ ] Benchmark comparisons (if industry data available)

- [ ] **Advanced Visualizations**
  - [ ] Interactive charts (line, bar, pie, area charts)
  - [ ] Heatmaps (session distribution by day/time)
  - [ ] Funnel analysis (booking → confirmation → completion)
  - [ ] Cohort retention tables
  - [ ] Trend lines with projections

- [ ] **Data Export & Reporting**
  - [ ] Export analytics to CSV/PDF
  - [ ] Scheduled reports (weekly/monthly email)
  - [ ] Custom report builder
  - [ ] Print-friendly views

- [ ] **Actionable Insights**
  - [ ] AI-powered recommendations (e.g., "Your revenue increased 20% this month")
  - [ ] Alerts for significant changes (revenue drops, high cancellation rates)
  - [ ] Goal tracking and progress indicators
  - [ ] Performance scorecards

### User Experience

- [ ] Pro-only badge/indicator on analytics dashboard
- [ ] Upgrade prompt for Starter tier users
- [ ] Intuitive navigation between different analytics views
- [ ] Customizable dashboard (drag-and-drop widgets)
- [ ] Save favorite views/reports
- [ ] Mobile-responsive analytics views
- [ ] Loading states and skeleton screens
- [ ] Empty states with helpful guidance

### Technical Requirements

- [ ] Real-time data updates (or near-real-time)
- [ ] Efficient data aggregation (use database views/functions)
- [ ] Caching for performance (reduce query load)
- [ ] Pagination for large datasets
- [ ] Filtering by date range, client, service type, status
- [ ] Search functionality within analytics

## Current Implementation Analysis

### Existing Analytics (`src/pages/AnalyticsDashboard.tsx`)

**Current Features:**

- Basic session count and revenue totals
- Average rating display
- Top clients list
- Monthly trends (basic)
- Session type distribution

**Limitations:**

- No Pro tier gating (available to all users)
- Basic visualizations only
- No forecasting or predictions
- No client retention metrics
- No export functionality
- Limited date range options (30d, this month)
- No comparative analytics
- No actionable insights

### Plan Context (`src/contexts/PlanContext.tsx`)

- Already has `isPro` check
- Can be used to gate Pro features

## Technical Requirements

### Phase 1: Database Schema & Aggregations

#### 1.1 Analytics Views (PostgreSQL)

```sql
-- Revenue analytics view
CREATE MATERIALIZED VIEW pro_revenue_analytics AS
SELECT
  therapist_id,
  DATE_TRUNC('day', session_date) as date,
  SUM(price) as daily_revenue,
  COUNT(*) as daily_sessions,
  AVG(price) as avg_session_value
FROM client_sessions
WHERE status = 'completed'
GROUP BY therapist_id, DATE_TRUNC('day', session_date);

-- Client retention view
CREATE MATERIALIZED VIEW pro_client_retention AS
SELECT
  therapist_id,
  client_name,
  MIN(session_date) as first_session_date,
  MAX(session_date) as last_session_date,
  COUNT(*) as total_sessions,
  SUM(price) as lifetime_value,
  EXTRACT(EPOCH FROM (MAX(session_date) - MIN(session_date))) / 86400 as days_active
FROM client_sessions
WHERE status = 'completed'
GROUP BY therapist_id, client_name;

-- Performance metrics view
CREATE MATERIALIZED VIEW pro_performance_metrics AS
SELECT
  therapist_id,
  DATE_TRUNC('month', session_date) as month,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_sessions,
  COUNT(*) FILTER (WHERE status = 'no_show') as no_show_sessions,
  AVG(price) FILTER (WHERE status = 'completed') as avg_revenue_per_session,
  SUM(price) FILTER (WHERE status = 'completed') as total_revenue
FROM client_sessions
GROUP BY therapist_id, DATE_TRUNC('month', session_date);

-- Refresh function (run daily via cron)
CREATE OR REPLACE FUNCTION refresh_pro_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY pro_revenue_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY pro_client_retention;
  REFRESH MATERIALIZED VIEW CONCURRENTLY pro_performance_metrics;
END;
$$ LANGUAGE plpgsql;
```

#### 1.2 Analytics Service Layer

```typescript
// src/lib/analytics/pro-analytics-service.ts
export class ProAnalyticsService {
  // Revenue Analytics
  static async getRevenueTrends(
    therapistId: string,
    startDate: Date,
    endDate: Date,
    granularity: "day" | "week" | "month" | "year",
  ): Promise<RevenueTrend[]>;

  static async getRevenueForecast(
    therapistId: string,
    days: number,
  ): Promise<RevenueForecast>;

  static async getRevenueBreakdown(
    therapistId: string,
    startDate: Date,
    endDate: Date,
    groupBy: "service" | "client" | "payment_method",
  ): Promise<RevenueBreakdown[]>;

  // Client Insights
  static async getClientRetention(
    therapistId: string,
  ): Promise<ClientRetentionMetrics>;

  static async getClientLifetimeValue(
    therapistId: string,
  ): Promise<ClientLTV[]>;

  static async getClientSegmentation(
    therapistId: string,
  ): Promise<ClientSegmentation>;

  // Performance Metrics
  static async getPerformanceMetrics(
    therapistId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<PerformanceMetrics>;

  static async getUtilizationRate(
    therapistId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<UtilizationMetrics>;

  // Comparative Analytics
  static async getPeriodComparison(
    therapistId: string,
    currentPeriod: { start: Date; end: Date },
    previousPeriod: { start: Date; end: Date },
  ): Promise<PeriodComparison>;
}
```

### Phase 2: Frontend Components

#### 2.1 Pro Analytics Dashboard

```typescript
// src/pages/analytics/ProAnalyticsDashboard.tsx
interface ProAnalyticsDashboardProps {
  // Pro-only analytics dashboard
}

// Features:
// - Tabbed interface (Revenue, Clients, Performance, Insights)
// - Customizable date ranges
// - Interactive charts (using recharts or similar)
// - Export buttons
// - Pro badge/indicator
```

#### 2.2 Analytics Components

```typescript
// Revenue Analytics Components
-RevenueTrendChart.tsx -
  RevenueForecastChart.tsx -
  RevenueBreakdownChart.tsx -
  RevenueComparisonCard.tsx -
  // Client Insights Components
  ClientRetentionChart.tsx -
  ClientLTVTable.tsx -
  ClientSegmentationChart.tsx -
  TopClientsTable.tsx -
  // Performance Components
  PerformanceMetricsCard.tsx -
  UtilizationRateChart.tsx -
  ConversionFunnelChart.tsx -
  GrowthMetricsCard.tsx -
  // Insights Components
  AIInsightsPanel.tsx -
  AlertsPanel.tsx -
  GoalTrackingCard.tsx -
  RecommendationsList.tsx;
```

#### 2.3 Pro Feature Gating

```typescript
// src/components/analytics/ProAnalyticsGate.tsx
export const ProAnalyticsGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isPro, loading } = usePlan();

  if (loading) return <LoadingSkeleton />;

  if (!isPro) {
    return <UpgradePrompt feature="Advanced Analytics & Insights" />;
  }

  return <>{children}</>;
};
```

### Phase 3: Advanced Features

#### 3.1 Export Functionality

```typescript
// src/lib/analytics/export-service.ts
export class AnalyticsExportService {
  static async exportToCSV(
    data: AnalyticsData,
    filename: string,
  ): Promise<void>;
  static async exportToPDF(
    data: AnalyticsData,
    filename: string,
  ): Promise<void>;
  static async generateReport(
    data: AnalyticsData,
    template: ReportTemplate,
  ): Promise<Blob>;
}
```

#### 3.2 Scheduled Reports

```typescript
// Edge Function: supabase/functions/scheduled-analytics-report/index.ts
// Runs daily/weekly/monthly via cron
// Generates reports and emails to practitioners
```

#### 3.3 AI Insights (Future Enhancement)

```typescript
// Integration with AI service for generating insights
// Example: "Your revenue increased 20% this month, driven by 5 new clients"
// Uses pattern recognition on analytics data
```

## Implementation Plan

### Sprint 1: Foundation (1 week)

1. ✅ Create database views for analytics aggregation
2. ✅ Build ProAnalyticsService with core methods
3. ✅ Create ProAnalyticsGate component
4. ✅ Set up basic Pro analytics dashboard structure
5. ✅ Add Pro tier check to existing analytics page

### Sprint 2: Revenue Analytics (1 week)

1. ✅ Implement revenue trends chart
2. ✅ Add revenue breakdown by service/client
3. ✅ Build revenue forecast (simple linear projection)
4. ✅ Create revenue comparison cards
5. ✅ Add custom date range picker

### Sprint 3: Client Insights (1 week)

1. ✅ Implement client retention metrics
2. ✅ Calculate and display client lifetime value
3. ✅ Build client segmentation view
4. ✅ Create top clients table with sorting
5. ✅ Add client acquisition trends

### Sprint 4: Performance & Comparative (1 week)

1. ✅ Build performance metrics dashboard
2. ✅ Implement utilization rate calculations
3. ✅ Add period-over-period comparisons
4. ✅ Create growth metrics cards
5. ✅ Build conversion funnel visualization

### Sprint 5: Advanced Features (1 week)

1. ✅ Implement export to CSV/PDF
2. ✅ Add scheduled reports (Edge Function)
3. ✅ Create customizable dashboard (drag-and-drop)
4. ✅ Build AI insights panel (basic version)
5. ✅ Add alerts and notifications

### Sprint 6: Polish & Testing (1 week)

1. ✅ Mobile responsiveness
2. ✅ Loading states and error handling
3. ✅ Unit and integration tests
4. ✅ Performance optimization
5. ✅ User acceptance testing

## Database Schema Changes

### New Tables

```sql
-- Analytics cache table (for performance)
CREATE TABLE pro_analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID REFERENCES users(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL,
  cache_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(therapist_id, cache_key)
);

-- Saved reports
CREATE TABLE pro_saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID REFERENCES users(id) ON DELETE CASCADE,
  report_name TEXT NOT NULL,
  report_config JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics goals
CREATE TABLE pro_analytics_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID REFERENCES users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL, -- 'revenue', 'sessions', 'clients'
  target_value DECIMAL(10,2) NOT NULL,
  target_date DATE NOT NULL,
  current_value DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes

```sql
CREATE INDEX idx_pro_revenue_analytics_therapist_date
  ON pro_revenue_analytics(therapist_id, date);

CREATE INDEX idx_pro_client_retention_therapist
  ON pro_client_retention(therapist_id);

CREATE INDEX idx_pro_performance_metrics_therapist_month
  ON pro_performance_metrics(therapist_id, month);

CREATE INDEX idx_pro_analytics_cache_therapist_expires
  ON pro_analytics_cache(therapist_id, expires_at);
```

## UI/UX Design

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│  Pro Analytics Dashboard                    [Export] [⚙️]│
├─────────────────────────────────────────────────────────┤
│  [Revenue] [Clients] [Performance] [Insights]          │
├─────────────────────────────────────────────────────────┤
│  Date Range: [Last 30 days ▼]  Compare: [Previous ▼]   │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │ Total       │ │ Avg Session │ │ Growth      │      │
│  │ Revenue     │ │ Value       │ │ Rate        │      │
│  │ £12,450     │ │ £85         │ │ +15% ↑      │      │
│  └─────────────┘ └─────────────┘ └─────────────┘      │
├─────────────────────────────────────────────────────────┤
│  Revenue Trend (Interactive Chart)                      │
│  [Line chart showing daily/weekly/monthly trends]      │
├─────────────────────────────────────────────────────────┤
│  Client Insights                                        │
│  ┌─────────────┐ ┌─────────────┐                       │
│  │ Retention  │ │ Top Clients │                       │
│  │ Rate: 75%  │ │ [Table]     │                       │
│  └─────────────┘ └─────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

### Key Design Principles

- **Clean, data-focused design** - Minimal distractions
- **Color-coded metrics** - Green for positive, red for negative
- **Interactive charts** - Hover for details, click to drill down
- **Responsive grid** - Adapts to screen size
- **Pro badge** - Clear indication of premium feature
- **Upgrade prompts** - For non-Pro users (with CTA)

## Metrics & Success Criteria

### Business Metrics

- **Pro Tier Adoption:** Increase Pro subscriptions by 20% within 3 months
- **Feature Usage:** >80% of Pro users access analytics at least once per week
- **User Satisfaction:** >4.5/5 rating for analytics feature
- **Retention Impact:** Pro users with analytics have 15% higher retention

### Technical Metrics

- **Page Load Time:** <2 seconds for analytics dashboard
- **Data Refresh:** <5 seconds for updated analytics
- **Export Performance:** <10 seconds for CSV export, <30 seconds for PDF
- **API Response Time:** <500ms for analytics queries (with caching)

### User Experience Metrics

- **Time to Insight:** Users find key metrics in <30 seconds
- **Feature Discovery:** >60% of Pro users use advanced features
- **Export Usage:** >40% of Pro users export reports monthly

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Pro tier gating implemented and tested
- [ ] Database views and aggregations created
- [ ] Analytics service layer complete
- [ ] All dashboard components built and responsive
- [ ] Export functionality working (CSV/PDF)
- [ ] Scheduled reports configured
- [ ] Unit tests for analytics calculations (>80% coverage)
- [ ] Integration tests for Pro gating
- [ ] Performance testing completed
- [ ] User acceptance testing passed
- [ ] Documentation updated
- [ ] Upgrade prompts for Starter tier users
- [ ] Monitoring and error tracking set up

## Priority

**High** - Core Pro tier feature that justifies subscription cost

## Story Points

**21** - Large feature requiring multiple sprints, database work, and complex visualizations

## Dependencies

- Pro tier subscription system (already exists)
- PlanContext for Pro checks (already exists)
- Chart library (recharts, chart.js, or similar)
- PDF generation library (jsPDF or similar)
- Database performance optimization

## Related Stories

- Client progress tracking (Pro feature)
- Advanced session notes (Pro feature)
- Export functionality for reports
- Scheduled email reports

## Notes

- Start with MVP features (revenue trends, client insights) and iterate
- Consider using a charting library like Recharts or Chart.js
- Cache analytics data to reduce database load
- Consider using Supabase Edge Functions for heavy aggregations
- Future: AI-powered insights using pattern recognition
- Future: Benchmark comparisons with anonymized industry data

## References

- Current Analytics: `src/pages/AnalyticsDashboard.tsx`
- Plan Context: `src/contexts/PlanContext.tsx`
- Subscription Plans: `src/components/onboarding/SubscriptionSelection.tsx`
- Pro Plan: £50/month, features include "Advanced analytics & insights"

## Scope & Constraints

- This story delivers a **first Pro-only analytics experience**, not the full long-term vision for analytics.
- We will **gate advanced analytics by Pro plan** using existing plan context / subscription state; non-Pro users see upgrade prompts.
- Data freshness may be **near real-time but not strictly real-time** (e.g. daily materialized view refreshes plus some on-demand queries).
- We will focus on **practitioner’s own practice analytics only**; cross-practitioner or industry benchmark views are out of scope.
- Export is limited to **CSV for key views** in this story; PDF and scheduled reports are treated as follow-ups.

## MVP Slice

- Backend:
  - Introduce minimal analytics views or functions to support:
    - Revenue over time (daily/weekly/monthly).
    - Simple performance metrics (completed sessions, cancellations, no-shows).
    - A basic notion of client value (e.g. total revenue and session count per client).
  - Wrap these in a focused `ProAnalyticsService` API.
- Frontend:
  - Add a **Pro Analytics** section/tab in `AnalyticsDashboard` (or a new `ProAnalyticsDashboard`) behind a `ProAnalyticsGate`.
  - Implement at least:
    - A revenue trend chart with date-range selection.
    - A “top clients” table (with total revenue / sessions).
    - A small performance summary card (utilization / cancellations).
  - Provide **CSV export** for the top clients table and maybe revenue data.
- UX:
  - Display a clear Pro badge and upgrade prompt for non-Pro users.
  - Keep layout simple and performant (no drag-and-drop customization yet).

## Open Questions / Decisions

- **MVP metrics:** Which 3–5 metrics absolutely must ship in the first Pro analytics release (e.g. revenue trend, top clients, utilization)?
- **Data latency:** Is daily refresh acceptable, or do we need more frequent updates for certain metrics?
- **Export expectations:** Is CSV-only sufficient for the first release, or do we need at least a simple PDF export for “print/share”?
- **Upsell behaviour:** Should non-Pro users see anonymized/sample analytics, or just a static upgrade prompt?

---

**Created:** 2025-01-27  
**Last Updated:** 2025-01-27  
**Status:** Ready for Backlog
