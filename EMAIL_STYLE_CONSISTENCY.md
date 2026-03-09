# Email Style Consistency Report

**Date**: 2025-02-11  
**Status**: ✅ **ALL TEMPLATES FOLLOW CONSISTENT STYLE**

## Summary

All 20 email templates follow the same design system with consistent fonts, colors, and styling. The only intentional variations are color-coded badges/buttons for different email types (success, warning, error).

---

## ✅ Font Consistency

**All templates use:**
- **Font Family**: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Font Source**: Google Fonts (Inter with weights 400, 500, 600, 700, 800, 900)
- **Font Loading**: Consistent across all templates via `<link>` tag

**Font Sizes:**
- Hero Title: `32px` (24px on mobile)
- Hero Subtitle: `16px`
- Card Title: `18px`
- Body Text: `16px`
- Labels: `12px`
- Footer: `14px`
- Button Text: `16px`

**Font Weights:**
- Hero Title: `900` (extra bold)
- Card Title: `700` (bold)
- Body Text: `400-600` (regular to semi-bold)
- Labels: `500` (medium)
- Buttons: `700` (bold)

---

## ✅ Color Consistency

### Base Colors (Same Across All Templates)

**Text Colors:**
- Primary Text: `#1e293b` (dark slate)
- Headings: `#0f172a` (darker slate)
- Labels: `#64748b` (slate gray)
- Body Text: `#475569` (slate)
- White Text: `#ffffff` (on colored backgrounds)

**Background Colors:**
- Email Background: `#f6f6f8` (light gray)
- Card Background: `#ffffff` (white)
- Footer Background: `#f8fafc` (very light gray)
- Info Box Background: `rgba(5, 150, 105, 0.05)` (light green tint)

**Border Colors:**
- Card Border: `#e2e8f0` (light gray)
- Button Border: Matches primary color

### Primary Colors (Vary by Email Type - Intentional)

**Success/Confirmation Emails** (Green - `#059669`):
- Booking confirmations
- Payment confirmations
- Peer bookings
- Peer credits earned
- Peer requests accepted
- Review requests
- Messages

**Warning Emails** (Orange - `#d97706`):
- 24-hour session reminders

**Urgent Emails** (Red-Orange - `#ea580c`):
- 2-hour session reminders

**Error/Cancellation Emails** (Red - `#dc2626`):
- 1-hour session reminders
- Cancellations
- Practitioner cancellations
- Peer credits deducted
- Peer booking cancellations
- Peer requests declined

### Gradient Colors (Adapt to Primary Color)

**Green Gradient** (Default - `#059669`):
- Header: `linear-gradient(135deg, #047857 0%, #059669 50%, #10b981 100%)`
- Hero: Same as header

**Orange Gradient** (`#d97706`):
- Header: `linear-gradient(135deg, #b45309 0%, #d97706 50%, #f59e0b 100%)`
- Hero: Same as header

**Red-Orange Gradient** (`#ea580c`):
- Header: `linear-gradient(135deg, #c2410c 0%, #ea580c 50%, #fb923c 100%)`
- Hero: Same as header

**Red Gradient** (`#dc2626`):
- Header: `linear-gradient(135deg, #b91c1c 0%, #dc2626 50%, #ef4444 100%)`
- Hero: Same as header

---

## ✅ Style Consistency

### Layout
- **Max Width**: `600px` (all templates)
- **Padding**: `32px 24px` (content), `24px 16px` on mobile
- **Border Radius**: `16px` (cards), `12px` (buttons), `20px` (badges)
- **Box Shadow**: `0 1px 3px rgba(0, 0, 0, 0.1)` (cards)

### Buttons
- **Padding**: `14px 28px`
- **Border Radius**: `12px`
- **Font Size**: `16px`
- **Font Weight**: `700`
- **Border**: `2px solid` (matches primary color)
- **Box Shadow**: `0 4px 6px -1px rgba(0, 0, 0, 0.1)`
- **Layout**: Table-based for email client compatibility

### Cards
- **Background**: `#ffffff`
- **Border**: `1px solid #e2e8f0`
- **Border Radius**: `16px`
- **Padding**: `24px`
- **Margin**: `24px 0`
- **Title Border**: `2px solid` (primary color)

### Icons
- **Size**: `40px × 40px`
- **Border Radius**: `8px`
- **Background**: `rgba(primaryColor, 0.1)` (adapts to primary color)
- **Icon Size**: `20px` (emoji font size)

---

## ✅ Branding Consistency

**All templates include:**
- **Brand Name**: "TheraMate." (with period, no tick logos)
- **Header**: Always shows "TheraMate." in white text on gradient background
- **Footer**: Consistent footer with brand name, support email link
- **Support Email**: `support@theramate.co.uk` (link color matches primary color)

---

## ✅ Mobile Responsiveness

**All templates include:**
- Viewport meta tag: `width=device-width, initial-scale=1.0`
- Media queries for screens < 600px:
  - Full-width containers
  - Reduced padding (`24px 16px`)
  - Smaller hero title (`24px`)
  - Full-width buttons

---

## 📊 Style Variations Summary

| Element | Consistency | Notes |
|---------|------------|-------|
| Font Family | ✅ 100% | All use Inter |
| Font Sizes | ✅ 100% | Consistent sizing |
| Text Colors | ✅ 100% | Same color palette |
| Background Colors | ✅ 100% | Same backgrounds |
| Hero Gradient | ✅ 100% | Adapts to primary color |
| Button Colors | ⚠️ Intentional | Varies by email type (green/orange/red) |
| Card Borders | ⚠️ Intentional | Border color matches primary color |
| Icon Backgrounds | ✅ 100% | Adapts to primary color |

---

## ✅ Conclusion

**All 20 email templates follow the same style, font, and color system.**

The only variations are:
1. **Primary colors** - Intentionally different for visual hierarchy (green for success, orange/red for warnings/errors)
2. **Gradients** - Adapt to match primary color
3. **Button/border colors** - Match primary color for consistency

All other elements (fonts, text colors, layouts, spacing, branding) are **100% consistent** across all templates.

---

**Status**: ✅ **CONSISTENT - All templates follow the same design system**
