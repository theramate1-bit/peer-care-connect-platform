# Dashboard Audit and Cleanup Plan

## Problems Identified

### 1. **Over-Engineering**
- 4 separate dashboard files with 90% duplicate code
- Unnecessary role-specific implementations
- MarketplaceVisibility and PracticeManagementHub used but may be redundant
- Complex stat calculations that query non-existent tables (`business_stats`)

### 2. **Irrelevant Features**
- `MarketplaceVisibility` component
- `PracticeManagementHub` component  
- Treatment Success Rate (using fake calculations)
- Monthly Revenue (querying non-existent tables)
- Active Patients (fake data)

### 3. **Non-Working Features**
- `business_stats` table doesn't exist - causing errors
- Stats calculations based on non-existent data
- Loading states return too early before data loads
- No error handling for failed queries

### 4. **Redundancy**
- Three dashboards (Massage, Osteopath, Sports) are nearly identical
- Only difference is icons and text labels
- All use same data sources
- All have same layout

## Solution: Unified Practitioner Dashboard

### Approach
Replace all three role-specific dashboards with a single unified `PractitionerDashboard.tsx` that:
- Uses `userProfile.user_role` to customize display
- Shows only essential, working features
- Uses real data from `client_sessions` table
- Removes broken/missing components

## Implementation

### Files to Create/Modify

1. **Create** `peer-care-connect/src/components/dashboards/PractitionerDashboard.tsx`
   - Single unified dashboard
   - Role-agnostic with customization based on `user_role`
   - Real session data
   - Simplified stats

2. **Update** `peer-care-connect/src/components/AppContent.tsx`
   - Replace all three dashboard imports with single PractitionerDashboard
   - Point all practitioner routes to same component

3. **Delete**:
   - `MassageTherapistDashboard.tsx`
   - `OsteopathDashboard.tsx`
   - `SportsTherapistDashboard.tsx`
   - `MarketplaceVisibility.tsx` (if unused)
   - `PracticeManagementHub.tsx` (check usage first)

## Features to Keep (Working)
- Today's Schedule (real session data)
- Booking Calendar
- Quick Stats (from client_sessions)
- Clean, simple layout

## Features to Remove (Broken/Irrelevant)
- MarketplaceVisibility
- PracticeManagementHub
- Treatment Success Rate
- business_stats queries
- Fake revenue/patient counts

## Success Criteria
- ✅ Single unified dashboard
- ✅ All stats use real data
- ✅ No queries to non-existent tables
- ✅ Clean, simple UI
- ✅ Role-appropriate customization
- ✅ Fast loading
- ✅ No redundant features

