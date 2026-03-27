# User Story: Address Validation & Pre-population in Onboarding

## Story Type

**Feature Enhancement**

## Epic

**Onboarding Experience Improvement**

## User Story

**As a** practitioner or client during onboarding  
**I want** my address to be validated and automatically pre-populated  
**So that** I can complete the onboarding process faster with accurate address information

## Acceptance Criteria

### Address Validation

- [ ] Address input fields validate against official postal databases (UK Royal Mail Postcode Address File)
- [ ] Invalid addresses are flagged with clear error messages
- [ ] Address format is standardized (e.g., proper capitalization, spacing)
- [ ] Postcode validation ensures format matches UK standards (e.g., SW1A 1AA, M1 1AA)
- [ ] Address suggestions appear as user types (autocomplete)

### Pre-population

- [ ] Browser geolocation API is used to suggest user's current location (with permission)
- [ ] If user has previously entered an address in the system, it's suggested
- [ ] Address fields are structured (street, city, county, postcode) and auto-filled from selection
- [ ] Coordinates (latitude/longitude) are automatically captured when address is validated

### User Experience

- [ ] Address input is intuitive and requires minimal typing
- [ ] Clear visual feedback when address is validated
- [ ] Option to manually enter address if autocomplete doesn't find it
- [ ] Mobile-responsive address input experience
- [ ] Loading states shown during address lookup

## Current Implementation

### Existing Components

- **SmartLocationPicker** (`src/components/ui/SmartLocationPicker.tsx`)
  - Uses Photon API (free, OpenStreetMap-based) for autocomplete
  - Provides basic location suggestions
  - No structured address fields
  - No official postal validation

- **GeocodingService** (`src/lib/geocoding.ts`)
  - Uses Nominatim API (free, OpenStreetMap-based)
  - Converts addresses to coordinates
  - No address validation

### Current Limitations

1. **No structured address fields** - Only collects free-text `location`, `clinicAddress`, `baseAddress`
2. **No official validation** - Addresses not validated against Royal Mail PAF
3. **No pre-population** - No browser geolocation or saved address suggestions
4. **Basic autocomplete** - Photon API provides suggestions but no format validation
5. **No postcode validation** - UK postcode format not enforced

## Technical Requirements

### Third-Party Service Needed: **YES** ✅

**Why a third-party is required:**

- Official postal databases (Royal Mail PAF) require licensing
- Real-time address validation needs up-to-date postal data
- Building and maintaining address databases is expensive and complex
- Third-party services provide structured address components (street, city, postcode)

### Recommended Third-Party Services

#### Option 1: **Loqate (GBG)** - **RECOMMENDED for UK**

- **Pros:**
  - UK-focused with Royal Mail PAF integration
  - Excellent UK postcode validation
  - Structured address components
  - Good autocomplete/type-ahead
  - GDPR compliant
- **Cons:**
  - Paid service (pricing varies by volume)
  - UK-focused (may need additional service for international)
- **Pricing:** Contact for quote (typically pay-per-lookup or monthly subscription)
- **API:** RESTful API with good documentation
- **Best for:** UK-focused healthcare platform

#### Option 2: **Google Places API**

- **Pros:**
  - Global coverage
  - Excellent autocomplete
  - Free tier available ($200/month credit)
  - Well-documented
  - Good mobile support
- **Cons:**
  - Not specifically UK postal database validated
  - Requires Google account and billing setup
  - May not have Royal Mail PAF validation
- **Pricing:** Free tier: $200/month credit, then $2.83 per 1000 requests
- **API:** REST and JavaScript SDK
- **Best for:** Global coverage with good UX

#### Option 3: **Addressy (PCA Predict)**

- **Pros:**
  - UK Royal Mail PAF integration
  - Good UK postcode validation
  - Structured address data
  - Affordable pricing
- **Cons:**
  - Primarily UK-focused
  - Less well-known than Google/Loqate
- **Pricing:** Contact for quote
- **API:** RESTful API
- **Best for:** UK-focused with budget constraints

#### Option 4: **GetAddress.io**

- **Pros:**
  - UK Royal Mail PAF integration
  - Simple API
  - Good documentation
  - Affordable (free tier available)
- **Cons:**
  - UK-only
  - Smaller company
- **Pricing:** Free tier: 20 requests/day, paid from £5/month
- **API:** RESTful API
- **Best for:** UK-focused with low volume

### Implementation Approach

#### Phase 1: Service Selection & Setup

1. Evaluate services based on:
   - UK postal validation accuracy
   - Cost (considering onboarding volume)
   - API reliability and documentation
   - GDPR compliance
   - Integration complexity
2. Set up API account and obtain credentials
3. Add API keys to environment variables

#### Phase 2: Component Enhancement

1. **Enhance SmartLocationPicker or create new AddressInput component:**

   ```typescript
   interface AddressInputProps {
     value: AddressData;
     onChange: (address: AddressData) => void;
     onValidationChange?: (isValid: boolean) => void;
     country?: "GB" | "US" | "CA"; // Default: 'GB'
     enableGeolocation?: boolean; // Default: true
   }

   interface AddressData {
     line1: string;
     line2?: string;
     city: string;
     county?: string;
     postcode: string;
     country: string;
     latitude?: number;
     longitude?: number;
     formattedAddress: string;
   }
   ```

2. **Add browser geolocation hook:**

   ```typescript
   // src/hooks/useGeolocation.ts
   const useGeolocation = () => {
     // Request browser location
     // Reverse geocode to get address
     // Return address suggestions
   };
   ```

3. **Create address validation service:**
   ```typescript
   // src/lib/address-validation.ts
   class AddressValidationService {
     static async validateAddress(address: string): Promise<ValidationResult>;
     static async autocomplete(query: string): Promise<AddressSuggestion[]>;
     static async getAddressFromPostcode(
       postcode: string,
     ): Promise<AddressData[]>;
   }
   ```

#### Phase 3: Onboarding Integration

1. Update `Onboarding.tsx` to use new address component
2. Replace free-text `location` with structured address fields
3. Add address validation before proceeding to next step
4. Store structured address data in database

#### Phase 4: Database Schema Updates

```sql
-- Add structured address fields to users table
ALTER TABLE users ADD COLUMN address_line1 VARCHAR(255);
ALTER TABLE users ADD COLUMN address_line2 VARCHAR(255);
ALTER TABLE users ADD COLUMN address_city VARCHAR(100);
ALTER TABLE users ADD COLUMN address_county VARCHAR(100);
ALTER TABLE users ADD COLUMN address_postcode VARCHAR(20);
ALTER TABLE users ADD COLUMN address_country VARCHAR(2) DEFAULT 'GB';

-- Keep existing location field for backward compatibility
-- Can be populated from structured fields if needed
```

## Technical Considerations

### Privacy & GDPR

- Browser geolocation requires explicit user consent
- Address data must be stored securely
- Consider data retention policies
- Ensure third-party service is GDPR compliant

### Performance

- Debounce autocomplete requests (300ms delay)
- Cache validated addresses
- Limit API calls to reduce costs
- Handle rate limiting gracefully

### Error Handling

- Fallback to manual entry if API fails
- Clear error messages for invalid addresses
- Retry logic for transient API failures
- Offline mode support (save draft, validate later)

### Cost Management

- Monitor API usage
- Implement request caching
- Use free tier where possible
- Consider batch validation for bulk operations

## Definition of Done

- [ ] Third-party address validation service integrated
- [ ] Address input component with autocomplete implemented
- [ ] Browser geolocation pre-population working (with consent)
- [ ] UK postcode validation enforced
- [ ] Structured address fields stored in database
- [ ] Onboarding flow updated to use new address component
- [ ] Error handling and fallback mechanisms in place
- [ ] Mobile-responsive address input
- [ ] Unit tests for address validation logic
- [ ] Integration tests for onboarding flow
- [ ] Documentation updated
- [ ] GDPR compliance verified
- [ ] Cost monitoring dashboard set up

## Priority

**Medium-High** - Improves user experience and data quality

## Story Points

**8** - Requires third-party integration, component development, and database changes

## Dependencies

- Third-party API account setup
- Environment variable configuration
- Database migration for structured address fields

## Related Stories

- Address validation in profile settings
- Address validation in booking flow
- Address search for practitioner discovery

## Notes

- Current implementation uses free OpenStreetMap services (Photon, Nominatim)
- These provide basic functionality but lack official postal validation
- For production-grade address validation, a paid third-party service is recommended
- Loqate is recommended for UK-focused healthcare platform due to Royal Mail PAF integration

## References

- Current SmartLocationPicker: `src/components/ui/SmartLocationPicker.tsx`
- Current GeocodingService: `src/lib/geocoding.ts`
- Onboarding flow: `src/pages/auth/Onboarding.tsx`
- Address validation lib: `src/lib/validation.ts`

## Scope & Constraints

- This story applies to the **onboarding flow only** (practitioner and client where onboarding collects address data).
- Structured address capture is added to the `users` table, but **existing free-text fields stay** for backward compatibility.
- Implementation targets **UK-first** behaviour (postcode format, validation); international support can follow in later stories.
- We will integrate **one primary provider** behind `AddressValidationService` (Loqate/GetAddress.io/Google Places) rather than multiple providers at once.
- Onboarding must remain **non-blocking**: users can proceed with a clearly flagged manual address if validation fails or the provider is unavailable.
- Address validation is **best-effort**, not a hard guarantee of postal deliverability.

## MVP Slice

- Introduce a reusable `AddressInput` component used by onboarding for practitioners (clients as a follow-up if needed).
- Use a single third-party provider via `AddressValidationService` to support:
  - Autocomplete suggestions.
  - UK postcode format validation.
  - Returning a structured `AddressData` object (line1/2, city, county, postcode, country, lat/lng).
- Store structured fields on `users` alongside existing `location` / `clinicAddress` / `baseAddress`.
- Show clear but simple UX:
  - Autocomplete dropdown.
  - “Validated” / “Manual entry” status.
  - Basic loading/error states during lookup.
- Track at least:
  - Count of validated vs manual addresses.
  - Provider error rate (for future tuning or switching).

## Open Questions / Decisions

- **Provider choice:** Which provider do we use first (Loqate vs GetAddress.io vs Google Places), given expected volume and UK focus?
- **Blocking vs warning:** Should we **block progression** if validation fails, or allow “continue with manual address” after an explicit warning?
- **Geo vs manual priority:** If browser geolocation and provider results disagree, which wins, or do we only use geolocation as a hint?
- **International expansion:** Do we need non-UK support in this story, or is UK-only acceptable until later iterations?
- **Data residency & GDPR:** Are there any additional data residency constraints (e.g. UK/EU-only data centres) that affect provider selection?

---

**Created:** 2025-01-27  
**Last Updated:** 2025-01-27  
**Status:** Ready for Backlog
