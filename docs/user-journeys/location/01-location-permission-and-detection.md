# User Journey #03: Location Permission, Detection & Management

**Journey Number:** 03
**Category:** Location
**User Persona:** Multiple (New User, Traveling User, Commuter, Permission-Denier)
**Last Updated:** 2026-02-16
**Status:** Draft

## Journey Overview

**Goal:** Enable the app to detect the user's location via GPS, map it to a metro area, detect location changes, and allow users to manage multiple saved locations for easy feed switching.

**Trigger:** User opens the app for the first time (permission flow) or opens/foregrounds the app (detection flow).

**Success Criteria:**

- User understands why location is needed and grants permission
- App correctly detects user's metro area from GPS
- Location changes are detected and user is prompted to act
- User can save, switch between, and manage multiple locations
- Users who deny permission can still use the app with manual location

**Estimated Duration:** 30 seconds (permission flow) / 5 seconds (detection prompt)

## Prerequisites

**Must Complete First:**

- App installed on device (mobile) or signup completed (web)

**Should Have:**

- Device GPS enabled (for automatic detection)
- Internet connectivity (for reverse geocoding and metro lookup)

---

## Scenario A: First-Time User — Location Permission Granted

### Persona

**Name:** Anita Shrestha
**Age:** 25
**Background:** Just moved to Phoenix from Nepal 2 months ago. Downloaded Nepally to find housing and connect with the local Nepali community.
**Device:** Samsung Galaxy A54 (Android)
**Metro:** Phoenix-Mesa-Chandler, AZ

### Step-by-Step Flow

#### Step 1: App Launch — Location Permission Screen

**Screen:** Location Permission Screen (new)
**User sees:**

- Nepally logo at top
- Map pin illustration
- Headline: "Nepally works best with your location"
- Body text: "We use your location to show you community posts, housing, jobs, and events near you. Your exact location is never shared — we only use it to determine your metro area."
- Primary button: "Enable Location"
- Secondary link: "Not Now"

**User action:** Taps "Enable Location"

**System response:**

- Native Android location permission dialog appears
- "Allow Nepally to access this device's location?"
- Options: "While using the app" / "Only this time" / "Don't allow"

**User action:** Selects "While using the app"

**System response:**

- Permission granted flag saved to local storage
- GPS coordinates fetched (lat: 33.4484, lng: -112.0740)
- Reverse geocode returns ZIP: "85004"
- `getMetroByZip("85004")` returns: Phoenix-Mesa-Chandler, AZ (CBSA: 38060)
- Transition to onboarding with metro area pre-filled

**Edge cases:**

- GPS takes too long (>5 seconds): Show spinner → "Getting your location..." → after 10s timeout, fall back to manual ZIP entry with message: "We couldn't detect your location. Please enter your ZIP code."
- Reverse geocode returns ZIP not in database: Fall back to manual ZIP entry with message: "We couldn't find your metro area. Please enter your ZIP code."

#### Step 2: Onboarding — Metro Confirmation (Pre-filled)

**Screen:** MetroConfirmationScreen (existing, modified)
**User sees:**

- "We found your community!"
- Metro area name: "Phoenix-Mesa-Chandler, AZ"
- Body: "Based on your location" (instead of "Based on your ZIP code")
- Confirm button
- "Not right? Enter ZIP code manually" link

**User action:** Taps "Confirm"

**System response:**

- User profile updated: `metro_area_id = "38060"`, `zip_code = "85004"`
- Saved location created: `{ name: "Home", metro_area_id: "38060", zip_code: "85004", is_default: true }`
- Proceed to Tutorial screen
- Location permission screen flag set (don't show again)

#### Step 3: Home Screen — Normal Feed

**Screen:** HomeScreen
**User sees:**

- Header: "Phoenix-Mesa-Chandler" with dropdown arrow (tappable)
- Local feed with posts from Phoenix metro area
- No location banner (permission was granted)

**Result:** User is set up with GPS-based location and can browse local content.

---

## Scenario B: First-Time User — Location Permission Denied

### Persona

**Name:** Deepak Tamang
**Age:** 32
**Background:** Privacy-conscious software developer in Seattle. Doesn't like giving apps location access.
**Device:** iPhone 15
**Metro:** Seattle-Tacoma-Bellevue, WA

### Step-by-Step Flow

#### Step 1: App Launch — Location Permission Screen

**User sees:** Same screen as Scenario A

**User action:** Taps "Not Now"

**System response:**

- Permission screen flag set (don't show again)
- Skip GPS detection
- Proceed to standard onboarding (Welcome screen)

#### Step 2: Standard Onboarding — Manual ZIP Entry

**Screen:** ZipCodeEntryScreen (existing, unchanged)

**User action:** Enters ZIP code "98101" and taps Continue

**System response:** Standard existing flow — lookup metro area, confirm, create profile

#### Step 3: Home Screen — Permission Reminder Banner

**Screen:** HomeScreen
**User sees:**

- Header: "Seattle-Tacoma-Bellevue" with dropdown arrow
- **New banner below header:** "Enable location for a better experience" [Turn On] [X]
  - Subtle, non-intrusive, dismissible
  - Light blue background with location pin icon

**User action:** Taps [X] to dismiss

**System response:**

- Banner hidden
- Dismiss count incremented (now 1 of 3 max)
- `lastDismissed` timestamp saved
- Banner won't appear again for 7 days

**Future behavior:**

- After 7 days, banner shows again on home screen visit (dismiss count 2)
- After 3rd dismissal, banner never shows again

#### Step 3b (alternate): User taps "Turn On"

**System response:**

- iOS: Opens app Settings page (deep link to Nepally in iOS Settings)
- User enables location permission in system settings
- On return to app: GPS check runs, location detected
- If detected metro matches stored metro: no action needed
- If detected metro differs: Location Change Prompt appears (Scenario C)

---

## Scenario C: Returning User — Location Change Detected

### Persona

**Name:** Rajesh Thapa
**Age:** 28
**Background:** Lives in Dallas, traveling to Houston for a weekend visit. Has Nepally with location enabled.
**Device:** iPhone 14
**Home Metro:** Dallas-Fort Worth-Arlington, TX (CBSA: 19100)
**Current GPS Metro:** Houston-The Woodlands-Sugar Land, TX (CBSA: 26420)

### Step-by-Step Flow

#### Step 1: App Open — Location Detection

**Trigger:** Rajesh opens Nepally while in Houston

**System behavior (invisible to user):**

1. App opens → foreground detection hook fires
2. Check: location permission granted? Yes
3. Check: manual override active? No (fresh app open)
4. Check: snooze active for any metro? No
5. Get GPS coordinates → reverse geocode → ZIP "77001"
6. `getMetroByZip("77001")` → Houston-The Woodlands-Sugar Land, TX (26420)
7. Compare: detected (26420) !== active (19100) → MISMATCH
8. Trigger Location Change Prompt

#### Step 2: Location Change Prompt

**Screen:** Bottom sheet overlay on HomeScreen
**User sees:**

- Location pin icon
- "It looks like you're in Houston"
- "Would you like to see community posts from this area?"
- Three buttons:
  1. "Browse Houston" (outlined/secondary)
  2. "Update My Location" (primary)
  3. "Keep Dallas" (text link)
- Checkbox: "Don't ask again for 24 hours"

**Option A: User taps "Browse Houston" (temporary)**

**System response:**

- Feed switches to Houston metro area (session only)
- Header changes to: "Houston-The Woodlands (Visiting)"
- "Visiting" badge shown in a lighter color
- Location switcher now shows "Return to Dallas-Fort Worth" option
- On next app restart: feed reverts to Dallas (stored home location)
- Manual override flag set → GPS detection won't re-prompt this session

**Option B: User taps "Update My Location" (permanent)**

**System response:**

- User's `metro_area_id` updated to "26420" in database
- Secondary prompt appears: "Save Houston as a location?"
  - Name input pre-filled with "Houston" (or next available default name)
  - "Save" and "Skip" buttons
- If saved: New entry in `user_saved_locations`
- Feed switches to Houston
- Manual override flag set

**Option C: User taps "Keep Dallas"**

**System response:**

- Prompt dismissed
- Feed stays on Dallas
- If "Don't ask for 24 hours" was checked: snooze record saved for metro "26420"
- If not checked: prompt will appear again next time app is opened in Houston

---

## Scenario D: Commuter — Using Saved Locations

### Persona

**Name:** Priya Maharjan
**Age:** 30
**Background:** Lives in Newark (New York metro), works in Philadelphia metro. Commutes weekly. Has both locations saved.
**Device:** iPhone 16
**Saved Locations:**

1. "Home" — New York-Newark (CBSA: 35620) [default]
2. "Work" — Philadelphia-Camden (CBSA: 37980)

### Step-by-Step Flow

#### Step 1: Home Screen — Location Switcher

**Trigger:** Priya taps on "New York-Newark" in the header

**Screen:** Location Switcher Bottom Sheet
**User sees:**

- Section: "Current Location"
  - GPS dot + "Philadelphia-Camden, PA" (detected via GPS)
  - "Switch to detected location" tappable link
- Section: "Your Locations"
  - "Home" — New York-Newark, NY [checkmark — active]
  - "Work" — Philadelphia-Camden, PA
- "Add a Location" button (shows if < 5 locations saved)
- "Manage Locations" link

**User action:** Taps "Work — Philadelphia-Camden"

**System response:**

- Feed immediately switches to Philadelphia metro posts
- Header updates to "Philadelphia-Camden"
- Manual override flag set (won't prompt about location mismatch this session)
- Active metro area cached locally

#### Step 2: Adding a New Location

**Trigger:** Priya taps "Add a Location"

**Screen:** Add Location modal/screen
**User sees:**

- Search input: "Search by metro name or ZIP code"
- As user types "Bos", results filter:
  - "Boston-Cambridge-Newton, MA"
- Or types "02101":
  - "Boston-Cambridge-Newton, MA (ZIP: 02101)"

**User action:** Selects "Boston-Cambridge-Newton"

**System response:**

- Name input appears: "What should we call this location?"
- Suggested name: "School" (next available default)
- User types: "Mom's Place"
- Taps "Save"
- New saved location created
- Returns to location switcher (now shows 3 locations)

#### Step 3: Managing Locations

**Trigger:** Priya taps "Manage Locations"

**Screen:** Location Management Screen
**User sees:**

- List of saved locations with edit/delete options:
  1. "Home" — New York-Newark, NY [star icon = default] [Edit] [Delete disabled — is default]
  2. "Work" — Philadelphia-Camden, PA [Edit] [Delete]
  3. "Mom's Place" — Boston-Cambridge-Newton, MA [Edit] [Delete]
- Each item has:
  - Rename (pencil icon)
  - Set as Default (star icon)
  - Delete (trash icon, with confirmation)
- "Add Location" button at bottom (if < 5)
- Counter: "3 of 5 locations saved"

**User action:** Taps delete on "Mom's Place"

**System response:**

- Confirmation: "Remove Mom's Place (Boston-Cambridge-Newton)?"
- "Remove" / "Cancel" buttons
- After confirm: location removed, list updates to 2 items

**Edge case — deleting the active non-default location:**

- Feed switches to default location
- Header updates accordingly

**Edge case — deleting default location:**

- Not allowed if it's the only location (delete button disabled)
- If 2+ locations: "Choose a new default location" picker appears before deletion

---

## Scenario E: Web User — Browser Geolocation

### Persona

**Name:** Suman Rai
**Age:** 35
**Background:** Uses Nepally on his laptop at work. Prefers the web version.
**Browser:** Chrome on Windows
**Metro:** Chicago-Naperville-Elgin, IL

### Step-by-Step Flow

#### Step 1: First Login — Geolocation Prompt

**Trigger:** After login, user navigates to `/feed` for the first time

**Page:** Feed page
**User sees:**

- Browser's native geolocation permission bar: "nepally.us wants to know your location" [Allow] [Block]
- Behind the permission bar, a banner on the page: "Allow location access to see posts near you"

**Option A: User clicks "Allow"**

**System response:**

- Browser provides GPS coordinates
- Reverse geocode → ZIP → metro area lookup
- Feed loads with detected metro area
- Location saved to user profile
- Location switcher dropdown in header becomes active

**Option B: User clicks "Block"**

**System response:**

- Falls back to the user's profile metro area (from onboarding)
- If no metro area set: shows metro area picker (search input + dropdown)
- Banner: "Enable location in browser settings for automatic detection" (dismissible, same 3-show limit)

#### Step 2: Web Location Switcher

**Trigger:** User clicks on metro name in header

**UI:** Dropdown popover (not bottom sheet — web pattern)
**User sees:**

- Current detected location (if geolocation active)
- Saved locations list
- Search input to find/add a metro area
- "Manage Locations" link (opens modal)

**Behavior:** Same logic as mobile, adapted to web UI patterns (dropdowns, modals instead of bottom sheets)

---

## Edge Cases & Error Handling

| Scenario                                                       | Behavior                                                                             |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| GPS disabled at OS level                                       | Treat as permission denied — use stored location + reminder banner                   |
| GPS returns coordinates in non-US location                     | Show: "Nepally is currently available in the US only. Showing your saved location."  |
| Network error during reverse geocode                           | Silently fail — use cached/stored location, retry on next app open                   |
| User has 5 saved locations and tries to add more               | "You've reached the maximum of 5 saved locations. Remove one to add a new location." |
| User's only saved location is deleted (shouldn't happen)       | Create a new default from their `users.metro_area_id`                                |
| Two saved locations point to the same metro (shouldn't happen) | Prevented by UNIQUE constraint on `(user_id, metro_area_id)`                         |
| User changes metro via onboarding ZIP retroactively            | Update the "Home" (default) saved location to match                                  |
| App opened in airplane mode                                    | No GPS available — use cached location, no prompt                                    |
| Reverse geocode returns a valid ZIP but no matching metro area | Show: "We couldn't find a metro area for your location. [Search manually]"           |

---

## State Diagram

```text
┌──────────────────┐
│   App Launched    │
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐     No
│ Permission screen    ├──────────► Manual ZIP Onboarding
│ shown before?        │             (existing flow)
└────────┬─────────────┘
         │ Yes (skip)
         ▼
┌──────────────────────┐     No
│ Location permission  ├──────────► Use stored metro area
│ granted?             │            + Show reminder banner
└────────┬─────────────┘
         │ Yes
         ▼
┌──────────────────────┐     No
│ Manual override      ├──────────► Get GPS coordinates
│ active?              │
└────────┬─────────────┘
         │ Yes
         ▼                          │
    Use manually                    ▼
    selected location     ┌──────────────────┐
                          │ Reverse geocode   │
                          │ GPS → ZIP → Metro │
                          └────────┬──────────┘
                                   │
                                   ▼
                          ┌──────────────────┐     Same
                          │ Compare detected  ├──────────► No action
                          │ vs active metro   │            (feed unchanged)
                          └────────┬──────────┘
                                   │ Different
                                   ▼
                          ┌──────────────────┐     Yes
                          │ Snooze active for ├──────────► No action
                          │ this metro area?  │
                          └────────┬──────────┘
                                   │ No
                                   ▼
                          ┌──────────────────────┐
                          │ Show Location Change  │
                          │ Prompt (Bottom Sheet) │
                          └───────────────────────┘
                             │         │         │
                    Browse   │  Update │  Keep   │
                    Temp     │  Perm   │  Current│
                             ▼         ▼         ▼
                          Session   DB Update   Dismiss
                          switch    + Save      (+ optional
                          + override  Location    snooze)
                          flag      + override
                                    flag
```

---

## API Requirements Summary

| API Call                 | Method                    | Shared Package Location                           |
| ------------------------ | ------------------------- | ------------------------------------------------- |
| Get metro by ZIP         | `getMetroByZip()`         | `packages/shared/src/api/metroArea.ts` (exists)   |
| Get metro by coordinates | `getMetroByCoordinates()` | `packages/shared/src/api/metroArea.ts` (new)      |
| Search metro areas       | `searchMetroAreas()`      | `packages/shared/src/api/metroArea.ts` (new)      |
| Get saved locations      | `getSavedLocations()`     | `packages/shared/src/api/savedLocations.ts` (new) |
| Add saved location       | `addSavedLocation()`      | `packages/shared/src/api/savedLocations.ts` (new) |
| Update saved location    | `updateSavedLocation()`   | `packages/shared/src/api/savedLocations.ts` (new) |
| Delete saved location    | `deleteSavedLocation()`   | `packages/shared/src/api/savedLocations.ts` (new) |
| Set default location     | `setDefaultLocation()`    | `packages/shared/src/api/savedLocations.ts` (new) |
| Update user metro area   | `updateUserLocation()`    | `packages/shared/src/api/users.ts` (exists)       |
