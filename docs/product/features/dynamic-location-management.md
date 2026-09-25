# Dynamic Location Management

**Status:** Planned
**Phase:** 1 (Utility Core & Trust Foundation)
**Last Updated:** 2026-09-22
**Platforms:** Mobile + Web

---

## Overview

Replace the static ZIP-code-only location model with a dynamic, GPS-aware location system. The app detects the user's physical location via device GPS, maps it to the nearest US Census metro area, and allows users to manage multiple saved locations. When a location change is detected (user in a different metro area), the app prompts them to browse temporarily or update their home location — similar to how UberEats and Groupon handle location-dependent content.

## Problem Statement

Currently, location is set once during onboarding via manual ZIP code entry and never changes. This creates problems for:

- **Travelers**: Users visiting another city see their home feed, not local content
- **Movers**: Users who relocate must somehow know to update their ZIP code (no guidance)
- **Commuters**: Users who work in a different metro area can't easily switch between home and work feeds
- **Trust**: No GPS verification of user location (anyone can type any ZIP code)

## User Stories

**Primary:**

- As a new user, I want the app to detect my location automatically so I don't have to manually type my ZIP code
- As a traveling user, I want the app to notice I'm in a different city and offer to show me local content
- As a commuter, I want to save my Home and Work locations so I can quickly switch between feeds
- As a privacy-conscious user, I want to understand why the app needs my location before granting access

**Secondary:**

- As a user who denied location access, I want to still use the app with my onboarding ZIP code location
- As a user who denied location access, I want periodic gentle reminders about enabling location
- As a user browsing a temporary location, I want to return to my home feed easily
- As a web user, I want similar location functionality using browser geolocation or manual selection

---

## Scope (Features)

| Feature                                 | Description                                                                                                    | Priority  |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------- |
| **L.1** Location Permission Screen      | Custom branded pre-permission screen explaining why location is needed, shown before onboarding                | Must-have |
| **L.2** GPS-to-Metro Mapping            | Reverse geocode GPS coordinates to determine which metro area the user is in                                   | Must-have |
| **L.3** Location Change Detection       | On app open/foreground, check GPS and compare to active metro area                                             | Must-have |
| **L.4** Location Change Prompt          | Modal/bottom sheet asking user to browse temporarily or update home location                                   | Must-have |
| **L.5** Saved Locations                 | Users can save named locations (Home, Work, custom). Free users: 1 location. Premium users: up to 5 locations. | Must-have |
| **L.6** Location Switcher (Home Screen) | Tappable location in header opens saved locations picker                                                       | Must-have |
| **L.7** Permission Denied Fallback      | Use onboarding ZIP as fallback + periodic subtle banner reminding to enable location                           | Must-have |
| **L.8** Snooze Prompt                   | "Remind me later" option on location change prompt (24-hour snooze)                                            | Must-have |
| **L.9** Manual Override                 | Manual location selection overrides GPS detection until next app restart                                       | Must-have |
| **L.10** Web Location Support           | Browser Geolocation API + manual metro picker fallback for Next.js web app                                     | Must-have |

**Out of scope (this iteration):**

- Radius-based filtering within a metro area (Phase 2: Hyper-Local)
- Background location tracking (only check on app open/foreground)
- Location-based push notifications
- Sharing real-time location with other users
- City/neighborhood granularity (stays at metro area level)

---

## Detailed Feature Design

### L.1 — Location Permission Screen

**When shown:**

- First app launch, before onboarding screens begin
- Only shown once (tracked via AsyncStorage/localStorage flag)

**Content:**

- App logo/branding
- Illustration of a map pin or community
- Headline: "Nepally works best with your location"
- Body: "We use your location to show you community posts, housing, jobs, and events near you. Your exact location is never shared — we only use it to determine your metro area."
- Primary CTA: "Enable Location" → triggers native OS permission dialog
- Secondary CTA: "Not Now" → skips to manual ZIP code onboarding

**Behavior after native dialog:**

- **Granted**: Get GPS coordinates → map to metro area → pre-fill ZIP/metro for onboarding confirmation
- **Denied**: Proceed to manual ZIP code entry (existing onboarding flow)

**Platform differences:**

- iOS: Requests "When In Use" permission only (not "Always")
- Android: Requests `ACCESS_FINE_LOCATION` permission
- Web: Uses browser `navigator.geolocation.getCurrentPosition()`

### L.2 — GPS-to-Metro Mapping

**Approach:** Reverse geocoding GPS coordinates to a ZIP code, then using existing `metro_area_zipcodes` lookup.

**Flow:**

1. Get device GPS coordinates (lat, lng)
2. Reverse geocode to get ZIP code (using Expo Location's `reverseGeocodeAsync` on mobile, or a lightweight geocoding service on web)
3. Look up metro area via existing `getMetroByZip()` shared API function
4. Return the `MetroArea` object

**Shared utility (packages/shared):**

```text
mapCoordinatesToMetro(supabase, lat, lng, reverseGeocodeFn) → MetroArea | null
```

- `reverseGeocodeFn` is a platform-injected function (dependency injection)
- Mobile passes `expo-location` reverse geocoder
- Web passes browser-based or API-based reverse geocoder

**Edge cases:**

- GPS coordinates outside any known metro area → show "We couldn't determine your metro area" + manual picker
- GPS coordinates map to a ZIP not in `metro_area_zipcodes` table → same fallback
- Reverse geocoding fails (network error) → silently fall back to cached/stored location

### L.3 — Location Change Detection

**When it runs:**

- Every time the app is opened (cold start)
- Every time the app returns to foreground (from background)
- Does NOT run in the background

**Logic:**

1. Check if location permission is granted
2. If no permission → skip detection, use stored location
3. If permission granted → get current GPS coordinates
4. Map to metro area via L.2
5. Compare detected metro area ID to the user's active metro area ID
6. If different → trigger Location Change Prompt (L.4)
7. If same → do nothing
8. If manual override is active (L.9) → skip detection for this session

**Snooze check (L.8):**

- Before showing the prompt, check if a snooze is active
- If snoozed within last 24 hours for this specific detected metro area → skip prompt
- Snooze data stored locally: `{ metroAreaId: string, snoozedUntil: timestamp }`

### L.4 — Location Change Prompt

**UI:** Bottom sheet / modal overlay

**Content:**

- Map pin icon + detected metro name
- Headline: "It looks like you're in [Metro Name]"
- Body: "Would you like to see community posts from this area?"
- Three actions:
  1. **"Browse [Metro Name]"** → Temporarily switch feed to detected metro (session-only)
  2. **"Update My Location"** → Permanently update `metro_area_id` in database + offer to save as named location
  3. **"Keep [Current Metro]"** → Dismiss prompt, keep current feed
- Snooze toggle: "Don't ask again for 24 hours" checkbox/link

**After "Browse [Metro Name]" (temporary):**

- Home screen header shows: "[Metro Name] (Visiting)" with a subtle indicator
- Feed switches to the detected metro area
- On next app restart, reverts to stored home location
- Location switcher shows "Return to [Home Metro]" option

**After "Update My Location" (permanent):**

- Database `metro_area_id` updated
- Secondary prompt: "Save [Metro Name] as a location?" with name input field
- If user has fewer than their max saved locations (1 for free, 5 for premium), pre-fill name suggestion ("Home", "Work", or metro name)
- If free user already has 1 saved location, show prompt: "Upgrade to Premium for up to 5 saved locations"

### L.5 — Saved Locations

**Data model:**

```text
user_saved_locations table:
  id: UUID (PK)
  user_id: UUID (FK → users.id)
  metro_area_id: TEXT (FK → metro_areas.id)
  name: TEXT (e.g., "Home", "Work", "Mom's Place")
  zip_code: TEXT (the ZIP that was used/detected)
  is_default: BOOLEAN (marks the primary/home location)
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ

Constraints:
  - UNIQUE(user_id, metro_area_id) — can't save same metro area twice
  - Free users: max 1 saved location
  - Premium users: max 5 saved locations
  - Enforced via application-level check (query user.is_premium + COUNT of saved locations)
  - Exactly one is_default = true per user
```

**Behavior:**

- During onboarding, the first location is auto-saved as "Home" with `is_default = true`
- Users can add, rename, and remove saved locations, and set any of them as the default
- The default location can't be removed: set another one as the default first
- Cannot remove the last remaining saved location (must always have at least 1)
- Removing a location asks for confirmation first
- A rename saves on Enter or when the field loses focus; on web, Escape cancels it. A name another saved location already uses (ignoring case) is refused
- Adding a location searches by metro name or ZIP code. A ZIP with no metro shows "No metros match." rather than an error

**Default names suggested:** Home, Work, School, Family, Custom

### L.6 — Location Switcher (Home Screen)

**Trigger:** Tap on the metro area name in the home screen header (currently static text)

**UI:** Bottom sheet with:

- **Current location** indicator (GPS dot + "Current: [Detected Metro]") — only if permission granted and detected metro differs from active
- **Saved locations list** (up to 5 items, each with name + metro name)
  - Active location has a checkmark
  - Each item tappable to switch feed
- **"Add a Location"** button → opens metro search / ZIP entry
- **"Manage Locations"** link → opens full location management screen (rename, delete, reorder)

**Switching behavior:**

- Tapping a saved location immediately switches the feed
- Sets that location as the active session location
- Manual override flag set (L.9) — GPS detection won't prompt again this session
- Header updates to show the selected metro name

### L.7 — Permission Denied Fallback

**Behavior when location permission is denied:**

- App works normally using the onboarding ZIP code metro area
- Location change detection (L.3) is disabled
- Location switcher (L.6) still works (manual selection only, no "Current location" row)

**Periodic reminder:**

- Show a dismissible banner on the home screen: "Enable location for a better experience" with a "Turn On" button
- Banner frequency rules:
  - Show on first home screen visit after denial
  - If dismissed, don't show again for 7 days
  - Maximum 3 total shows — after the 3rd dismissal, never show again
- Banner stored in local storage: `{ dismissCount: number, lastDismissed: timestamp }`

**"Turn On" button behavior:**

- Mobile: Opens app settings (deep link to iOS Settings / Android App Info)
- Web: Re-triggers `navigator.geolocation.getCurrentPosition()` permission prompt

### L.8 — Snooze Prompt

**When user selects "Don't ask for 24 hours":**

- Store snooze record locally: `{ metroAreaId: "19100", snoozedUntil: <now + 24h> }`
- Can have multiple snooze records (one per metro area)
- On next location check, if detected metro has an active snooze → skip prompt
- Snooze records cleaned up on app launch (remove expired entries)

### L.9 — Manual Override

**When triggered:**

- User manually selects a location from saved locations (L.6)
- User manually searches/enters a metro area

**Behavior:**

- Sets a session-level flag: `manualOverrideActive = true`
- While flag is active, location change detection (L.3) skips GPS check
- Flag resets on app restart (cold start)
- Flag does NOT reset on foreground resume (only on full app restart)

### L.10 — Web Location Support

**Browser Geolocation:**

- On first visit (after signup/login), prompt for browser geolocation permission
- If granted: same GPS-to-metro flow as mobile
- If denied: manual metro area picker

**Manual Metro Picker (fallback):**

- Search input: type metro name or ZIP code
- Dropdown results from `metro_areas` table (filtered as user types)
- Select to set active location

**Web-specific differences:**

- No "app open" detection — check location on page load of feed page
- Snooze and session override stored in `localStorage`
- Banner reminder uses same rules as mobile but styled as a web toast/banner
- Location switcher is a dropdown/popover instead of bottom sheet

---

## Database Changes

### New Table: `user_saved_locations`

```sql
CREATE TABLE user_saved_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metro_area_id TEXT NOT NULL REFERENCES metro_areas(id),
  name TEXT NOT NULL DEFAULT 'Home',
  zip_code TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, metro_area_id)
);

-- Max saved locations enforced at application level:
-- Free users: 1 location, Premium users: 5 locations
-- Use a trigger or application check:
-- IF (user.is_premium = false AND count >= 1) THEN RAISE
-- IF (user.is_premium = true AND count >= 5) THEN RAISE
-- Note: Pure CHECK constraint with subquery doesn't work in PostgreSQL.
-- Enforce via RLS policy or application-level check + trigger instead.

-- Indexes
CREATE INDEX idx_saved_locations_user ON user_saved_locations(user_id);

-- RLS
ALTER TABLE user_saved_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own saved locations"
  ON user_saved_locations FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved locations"
  ON user_saved_locations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved locations"
  ON user_saved_locations FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved locations"
  ON user_saved_locations FOR DELETE USING (auth.uid() = user_id);
```

### Migration for Existing Users

When this feature ships, existing users need their current `metro_area_id` migrated to the new `user_saved_locations` table as their default "Home" location:

```sql
INSERT INTO user_saved_locations (user_id, metro_area_id, name, zip_code, is_default)
SELECT id, metro_area_id, 'Home', zip_code, true
FROM users
WHERE metro_area_id IS NOT NULL;
```

---

## Shared Package Additions (`packages/shared/`)

### Types (`src/types/location.ts`)

- `SavedLocation` — matches `user_saved_locations` table schema
- `LocationChangePromptAction` — enum: 'browse_temporarily' | 'update_location' | 'keep_current'
- `LocationPermissionStatus` — enum: 'granted' | 'denied' | 'undetermined'
- `LocationSnoozeRecord` — `{ metro_area_id: string, snoozed_until: string }`
- `ReverseGeocodeFn` — type for platform-injected reverse geocoding function

### API Functions (`src/api/savedLocations.ts`)

- `getSavedLocations(supabase, userId)` → `SavedLocation[]`
- `addSavedLocation(supabase, userId, metroAreaId, name, zipCode, isDefault)` → `SavedLocation`
- `updateSavedLocation(supabase, locationId, updates)` → `SavedLocation`
- `deleteSavedLocation(supabase, locationId)` → `void`
- `setDefaultLocation(supabase, userId, locationId)` → `void`
- `getSavedLocationCount(supabase, userId)` → `number`

### API Functions (`src/api/metroArea.ts` — additions)

- `searchMetroAreas(supabase, query)` → `MetroArea[]` (search by name or ZIP)
- `getMetroByCoordinates(supabase, lat, lng, reverseGeocodeFn)` → `MetroArea | null`

### Utils (`src/utils/location.ts`)

- `isSnoozeActive(snoozeRecords, metroAreaId)` → `boolean`
- `createSnoozeRecord(metroAreaId, durationHours)` → `LocationSnoozeRecord`
- `cleanExpiredSnoozes(snoozeRecords)` → `LocationSnoozeRecord[]`
- `suggestLocationName(existingNames)` → `string` (suggests next available default name)

### Constants (`src/constants/location.ts`)

- `MAX_SAVED_LOCATIONS_FREE = 1`
- `MAX_SAVED_LOCATIONS_PREMIUM = 5`
- `SNOOZE_DURATION_HOURS = 24`
- `LOCATION_REMINDER_MAX_SHOWS = 3`
- `LOCATION_REMINDER_COOLDOWN_DAYS = 7`
- `DEFAULT_LOCATION_NAMES = ['Home', 'Work', 'School', 'Family', 'Other']`

---

## Platform-Specific Code

### Mobile (`apps/mobile/`)

- **`expo-location`** package for GPS + reverse geocoding
- **Location permission hook**: `useLocationPermission()` — manages permission state, request, settings deep link
- **Location detection hook**: `useLocationDetection()` — runs on app foreground, manages snooze/override state
- **Location Permission Screen**: New screen in onboarding navigator
- **Location Change Modal**: Bottom sheet component
- **Location Switcher Bottom Sheet**: Reusable bottom sheet for saved locations
- **AsyncStorage keys**: Permission screen shown flag, snooze records, manual override flag, reminder dismiss count

### Web (`apps/web/`)

- **Browser Geolocation API** for GPS coordinates
- **Location detection hook**: `useLocationDetection()` — checks on feed page load
- **Metro Search Component**: Search input + dropdown for manual metro selection
- **Location Switcher Popover**: Dropdown/popover version of mobile bottom sheet
- **localStorage keys**: Same as mobile AsyncStorage keys

---

## Dependencies

### New Packages Required

| Package                           | Platform | Purpose                                                      |
| --------------------------------- | -------- | ------------------------------------------------------------ |
| `expo-location`                   | Mobile   | GPS coordinates + reverse geocoding                          |
| `@gorhom/bottom-sheet` or similar | Mobile   | Bottom sheet for location prompts (if not already installed) |

### Existing Packages Used

- `@supabase/supabase-js` — database queries
- `@react-navigation/native` — navigation for new screens
- `react-native-safe-area-context` — safe area handling
- `@expo/vector-icons` (Ionicons) — location pin icons

---

## Success Metrics

- **Permission grant rate**: % of users who enable location access on first prompt
- **Location switch adoption**: % of users who use the location switcher at least once
- **Saved locations usage**: Average number of saved locations per active user
- **Prompt dismissal rate**: % of location change prompts dismissed vs acted on
- **Feed relevance**: Reduction in users viewing content from wrong metro area

---

## Related Documents

- User Journey: `docs/user-journeys/location/01-location-permission-and-detection.md`
- Wireframes: `docs/wireframes/11-location-permission-screen.md`
- Wireframes: `docs/wireframes/12-location-change-prompt.md`
- Wireframes: `docs/wireframes/13-location-switcher.md`
- Database Schema: `docs/architecture/database-schema.md`
- Code Sharing Guide: `docs/guides/code-sharing.md`
