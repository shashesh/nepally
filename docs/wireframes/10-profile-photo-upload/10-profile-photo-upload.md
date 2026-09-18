# Wireframe: Profile Photo Upload

> **Screen:** 10 | **Status:** Draft | **Updated:** 2026-02-19
> **Journey:** [post-likes-and-comments.md](../../product/features/post-likes-and-comments.md) - Feature 3.5
> **Story:** As a user, I want to upload my profile photo so others can recognize me on posts and comments.

---

## Screen Purpose

Allow users to upload, crop, and set their profile photo. The photo will be displayed on:

- Post cards (author avatar)
- Post detail screen (author section)
- Comments (commenter avatar)
- Chat conversations (avatar in conversation list and message thread)
- Profile screen (large avatar)

**Key Goals:**

- Simple photo upload from camera or library
- Crop to square (1:1 aspect ratio)
- Preview before upload
- Auto-compress to optimize storage
- Fallback to initials if no photo

---

## Visual Wireframe

### Edit Profile Screen with Photo Section

::: card
[← Edit Profile                                          ✓]{.nav}

::: card {.centered}
![Avatar: JD initials on blue circle](avatar-placeholder) {64x64 circle}

[Change Photo]{.link}
:::

[Full Name ___]{.field}

[...more profile fields...]
:::

---

### Photo Picker Modal (Action Sheet)

::: modal

### Select Photo

[📷  Take Photo]*

[🖼️  Choose from Library]*

[🗑️  Remove Photo]{.destructive}

---

[Cancel]{.secondary}
:::

---

### Image Cropping Screen (After Selection)

::: card {.dark}
[Cancel                                                Done]{.nav}

::: card {.centered}
![Selected image with square crop overlay](crop-preview) {80% width, 1:1 ratio}

[───────────●──────────]{.slider} Zoom 1×–3×

::: alert info
Drag to reposition · Pinch to zoom
:::
:::
:::

---

### Upload Loading State

::: card
[← Edit Profile]{.nav}

::: card {.centered}
![Avatar with spinner overlay](avatar-loading) {64x64 circle}

Uploading photo...
:::

[...profile fields disabled...]
:::

---

### Upload Success State

::: card
[← Edit Profile                                          ✓]{.nav}

::: card {.centered}
![New profile photo](avatar-new) {64x64 circle}

Photo updated! {.success}
:::
:::

---

### Upload Error State

::: alert error
:warning: **Upload Failed**
Failed to upload photo. Check your connection and try again.

[Retry]*
:::

---

## Component Specifications

### 1. Profile Photo Display (EditProfileScreen)

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Circular avatar with button | Circular avatar with button |
| **Position** | Top of EditProfileScreen, centered | Top of EditProfileScreen, centered |
| **Margin top** | 24px | 24dp |
| **Margin bottom** | 24px | 24dp |

#### Avatar Display

| Property | iOS | Android |
|----------|-----|---------|
| **Size** | 64×64px circle | 64×64dp circle |
| **Border** | 2px solid #E0E0E0 | 2px solid #E0E0E0 |

**Content:**

- If photo uploaded: Display profile photo
- If no photo: Display initials (e.g., "JD" for John Doe)
  - Typography: 24pt/22sp Semibold, #FFFFFF (white text)
  - Background color based on trust level:
    - Level 0: #E0E0E0 (Light Gray)
    - Level 1: #4A90E2 (Blue)
    - Level 2: #7B61FF (Purple)

**Interaction:** Tap avatar → open photo picker modal (same as "Change Photo" button)

#### Change Photo Button

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Text button | Text button |
| **Position** | Below avatar, centered | Below avatar, centered |
| **Margin** | 12px from avatar | 12dp from avatar |
| **Font** | 15pt Semibold, San Francisco | 14sp Semibold, Roboto |
| **Color** | #1565C0 (Primary Blue) | #1565C0 |
| **Underline** | Yes (always visible) | Yes (always visible) |
| **Touch target** | 44×44pt min | 48×48dp min |

**Text:**

- If no photo: "Add Photo"
- If photo exists: "Change Photo"

**Interaction:** Tap button → open photo picker modal
**a11y:** "Change profile photo, button" or "Add profile photo, button"

---

### 2. Photo Picker Modal (Action Sheet)

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Bottom sheet modal | Action Sheet (Material) |
| **Overlay** | Semi-transparent black (50% opacity) | Semi-transparent black (50% opacity) |
| **Background** | White (#FFFFFF) | White (#FFFFFF) |
| **Corner radius** | 16px top corners | 16dp top corners |
| **Height** | Auto (fits content) | Auto (fits content) |

**Modal Title:**

| Property | iOS | Android |
|----------|-----|---------|
| **Text** | "Select Photo" | "Select Photo" |
| **Font** | 17pt Semibold, San Francisco | 16sp Semibold, Roboto |
| **Color** | #212121 | #212121 |
| **Alignment** | Center | Center |
| **Padding** | 20px vertical | 20dp vertical |

**Options:** Each option is a tappable row (56px/56dp height):

#### Option 1: Take Photo

- **Icon:** 📷 (camera), 24×24px, #1565C0
- **Label:** "Take Photo" (17pt/16sp Regular, #212121)
- **Action:** Open device camera → capture photo → navigate to crop screen
- **Permissions:** Request camera permission if not granted

#### Option 2: Choose from Library

- **Icon:** 🖼️ (picture frame), 24×24px, #1565C0
- **Label:** "Choose from Library" (17pt/16sp Regular, #212121)
- **Action:** Open photo library picker → select photo → navigate to crop screen
- **Permissions:** Request photo library permission if not granted

#### Option 3: Remove Photo (conditional)

- **Icon:** 🗑️ (trash can), 24×24px, #C62828 (Accent Red)
- **Label:** "Remove Photo" (17pt/16sp Regular, #C62828)
- **Display:** Only shown if user has existing photo
- **Action:**
  - Show confirmation dialog: "Remove profile photo?"
  - On confirm: Delete photo from Supabase Storage, set `users.profile_photo = null`, update UI to show initials
- **a11y:** "Remove profile photo, button, destructive action"

#### Cancel Button

- **Style:** Secondary (gray text)
- **Label:** "Cancel" (17pt/16sp Semibold, #757575)
- **Action:** Close modal, return to EditProfileScreen
- **Separator:** 8px gray divider above cancel button

**States:**

- Default: White background, options visible
- Pressed: Light gray background (#F5F5F5) on tapped option
- Closing: Slide down animation (300ms)

**a11y:**

- Modal announced: "Select photo, sheet"
- Each option announced separately
- Swipe down to dismiss (iOS)

---

### 3. Image Cropping Screen

| Property | iOS | Android |
|----------|-----|---------|
| **Type** | Full-screen modal | Full-screen modal |
| **Background** | Black (#000000) | Black (#000000) |
| **Nav bar text** | White on black | White on black |

#### Header

| Property | iOS | Android |
|----------|-----|---------|
| **Height** | 44px | 56dp |
| **Background** | Black (#000000) | Black (#000000) |
| **Cancel (left)** | White text, "Cancel" | White text, "Cancel" |
| **Done (right)** | White text, "Done" | White text, "Done" |

- **Cancel action:** Discard changes, return to EditProfileScreen
- **Done action:** Proceed to upload (disabled if image not cropped/positioned)

#### Image Preview Area

| Property | iOS | Android |
|----------|-----|---------|
| **Background** | Black (#000000) | Black (#000000) |
| **Crop area** | Fixed 1:1 aspect ratio (square) | Fixed 1:1 aspect ratio (square) |
| **Crop size** | 80% of screen width (max) | 80% of screen width (max) |
| **Crop border** | 2px white | 2px white |
| **Outside overlay** | 50% black opacity | 50% black opacity |
| **Pan gesture** | Drag to reposition | Drag to reposition |
| **Pinch gesture** | Zoom 1×–3× | Zoom 1×–3× |

#### Help Text (Bottom)

| Property | iOS | Android |
|----------|-----|---------|
| **Font** | 14pt Regular, San Francisco | 13sp Regular, Roboto |
| **Color** | #FFFFFF (white) | #FFFFFF (white) |
| **Position** | Bottom center, 32px from bottom | Bottom center, 32dp from bottom |
| **Background** | Semi-transparent black pill (60% opacity), 8px padding | Semi-transparent black pill (60% opacity), 8dp padding |

**Content:** "Drag to reposition" · "Pinch to zoom"

#### Zoom Slider (Optional)

| Property | iOS | Android |
|----------|-----|---------|
| **Width** | 200px | 200dp |
| **Track height** | 4px | 4dp |
| **Track color** | #FFFFFF at 30% opacity | #FFFFFF at 30% opacity |
| **Thumb** | 24×24px circle, #FFFFFF | 24×24dp circle, #FFFFFF |
| **Range** | 1×–3× zoom | 1×–3× zoom |

**a11y:**

- "Crop profile photo screen"
- "Drag image to position, pinch to zoom"
- "Done button" / "Cancel button"

---

### 4. Upload Loading State

**Display:** On EditProfileScreen during upload

**Changes:**

- Avatar shows spinner overlay:
  - Background: Black (#000000) at 50% opacity over current avatar
  - Spinner: White circular spinner (24×24px)
- Status text below avatar: "Uploading photo..." (13pt Regular, #757575)
- "Change Photo" button disabled (grayed out)
- Save button in header disabled

**Duration:** 2–5 seconds (typical upload time)

**Success:**

- Avatar updates to show new photo
- Status text: "Photo updated!" (green text, #2E7D32)
- Status fades out after 2 seconds
- Save button re-enabled

**Error:**

- Avatar reverts to previous state (or initials if first upload)
- Status text: "Upload failed. Try again." (red text, #C62828)
- Toast notification: "Failed to upload photo. Check your connection and try again."
- "Change Photo" button re-enabled

---

## Spacing & Layout

### Edit Profile Screen (Vertical Stack)

| # | Element | Height | Spacing After |
|---|---------|--------|---------------|
| 1 | Safe area / Status bar | Auto | — |
| 2 | Header (← Edit Profile / ✓) | 44px / 56dp | — |
| 3 | Top padding | 24px/dp | — |
| 4 | Avatar | 64px/dp | 12px/dp |
| 5 | Change Photo button | 44px/dp touch | 24px/dp |
| 6 | Profile fields | Flex | — |
| 7 | Bottom safe area (iOS) | Auto | — |

### Photo Picker Modal

| # | Element | Height | Spacing After |
|---|---------|--------|---------------|
| 1 | Title ("Select Photo") | Auto | 20px/dp |
| 2 | Take Photo row | 56px/dp | 0 |
| 3 | Choose from Library row | 56px/dp | 0 |
| 4 | Remove Photo row (conditional) | 56px/dp | 8px (divider) |
| 5 | Cancel button | 56px/dp | 0 |

### Crop Screen

| # | Element | Height | Spacing After |
|---|---------|--------|---------------|
| 1 | Header (Cancel / Done) | 44px / 56dp | 0 |
| 2 | Image preview + crop overlay | Flex | 24px/dp |
| 3 | Zoom slider (optional) | 24px/dp | Flex |
| 4 | Help text pill | Auto | 32px/dp from bottom |

**Horizontal:** 16px/dp margins on both sides. Avatar centered. Crop area 80% width centered.

---

## User Interactions

### Happy Path (Upload Photo)

1. User navigates to EditProfileScreen
2. User taps "Change Photo" button
3. Photo picker modal appears (slide-up animation 300ms)
4. User selects "Choose from Library"
5. System checks photo library permission → granted
6. Photo library picker opens (system UI)
7. User selects a photo
8. Image cropping screen appears with selected photo
9. User drags/pinches to position and zoom
10. User taps "Done"
11. System crops image to square (500×500px)
12. System compresses image to < 500KB (80% JPEG quality)
13. Loading state: Avatar shows spinner + "Uploading photo..."
14. System uploads to Supabase Storage: `avatars/{userId}.jpg`
15. System updates `users.profile_photo` field with Storage URL
16. Avatar updates to show new photo
17. Status: "Photo updated!" (green text, fades after 2s)
18. User continues editing other profile fields or taps Save

### Alternative Flow (Take Photo)

1–3 same as above
4. User selects "Take Photo"
5. System checks camera permission → granted
6. Camera opens (system UI)
7. User takes photo
8–18 continue from Happy Path step 8

### Alternative Flow (Remove Photo)

1–3 same as above
4. User selects "Remove Photo"
5. Confirmation dialog: "Remove profile photo? This will replace your photo with your initials."
6. User taps "Remove"
7. System deletes `avatars/{userId}.jpg` from Supabase Storage
8. System sets `users.profile_photo = null`
9. Avatar updates to show initials
10. Status: "Photo removed" (gray text, fades after 2s)

### Alternative Flow (Permission Denied)

1–4 same as Happy Path
5. System checks photo library permission → denied
6. Alert dialog:

   - Title: "Photo Library Access Required"
   - Message: "Please grant photo library access in Settings to choose a profile photo."
   - Buttons: "Cancel", "Open Settings"

7. If user taps "Open Settings": Navigate to system Settings, app permissions
8. User manually grants permission → returns to app
9. User repeats flow (now permission granted)

---

## Error States & Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| **Image too large (> 5MB)** | Show toast: "Photo too large. Please choose a smaller image (max 5MB)." |
| **Invalid image format** | Show toast: "Unsupported format. Please choose a JPEG or PNG image." |
| **Upload fails (network)** | Show toast: "Upload failed. Check your connection and try again." Revert to previous avatar. |
| **Storage bucket full** | Show toast: "Upload failed. Please try again later." (rare, admin should monitor storage) |
| **Permission denied permanently** | Guide user to Settings app with instructions |
| **User cancels crop** | Return to EditProfileScreen, no changes saved |
| **Multiple rapid uploads** | Disable "Change Photo" button during upload, queue uploads if multiple triggered |
| **No profile photo set** | Show initials in avatar, "Add Photo" button instead of "Change Photo" |

---

## Accessibility

### Screen Reader Order

**EditProfileScreen:**

1. "Edit profile"
2. "Profile photo, [name initials or photo description]"
3. "Change photo button" / "Add photo button"
4. Profile fields...

**Photo Picker Modal:**

1. "Select photo sheet"
2. "Take photo button"
3. "Choose from library button"
4. "Remove photo button" (if exists)
5. "Cancel button"

**Crop Screen:**

1. "Crop photo screen"
2. "Drag image to position, pinch to zoom"
3. "Cancel button"
4. "Done button"

**Avatar states:**

- With photo: "Your profile photo"
- Without photo: "Your initials J D, no photo uploaded"

### Touch Targets

- Avatar: 64×64px ✓ (exceeds minimum)
- Change Photo button: 44×44pt / 48×48dp ✓
- All modal options: 56px height ✓

### Color Contrast (WCAG)

| Element | Ratio | Level |
|---------|-------|-------|
| Button text (#1565C0 on #FFFFFF) | 7.2:1 | AAA ✓ |
| Help text (white on black) | 21:1 | AAA ✓ |
| Status text (#757575 on #FFFFFF) | 4.6:1 | AA ✓ |

---

## Platform-Specific Differences

| Aspect | iOS | Android |
|--------|-----|---------|
| **Photo Picker** | Bottom sheet | Bottom sheet (Material) |
| **Camera UI** | Native iOS camera | Native Android camera |
| **Photo Library** | Native Photos app picker | System photo picker (Material) |
| **Crop UI** | Manual gestures + slider | Manual gestures + slider |
| **Permissions** | NSCameraUsageDescription, NSPhotoLibraryUsageDescription | CAMERA, READ_EXTERNAL_STORAGE |
| **Header height** | 44px | 56dp |
| **Press feedback** | Scale 0.98 + haptic | Scale 0.98 + ripple |
| **Modal dismiss** | Swipe down | Tap outside or back button |

---

## Technical Notes

### Image Processing

**Upload Requirements:**

- **Max file size:** 5MB (before compression)
- **Supported formats:** JPEG, PNG
- **Max dimensions:** 500×500px (after crop and resize)
- **Compression quality:** 80% JPEG quality
- **Target file size:** < 500KB (post-compression)

**Cropping:**

- 1:1 aspect ratio (square)
- Output dimensions: 500×500px
- Center-crop if user doesn't adjust

**Storage:**

- **Bucket:** `avatars/` in Supabase Storage
- **Filename:** `{userId}.jpg` (overwrites previous photo)
- **URL:** `https://{supabase-project}.supabase.co/storage/v1/object/public/avatars/{userId}.jpg`
- **Database update:** Save URL to `users.profile_photo` field

### Permissions

**iOS:**

- `NSCameraUsageDescription`: "We need access to your camera to take a profile photo"
- `NSPhotoLibraryUsageDescription`: "We need access to your photo library to choose a profile photo"

**Android:**

- `android.permission.CAMERA`: "Camera access"
- `android.permission.READ_EXTERNAL_STORAGE`: "Photo library access"

**Permission Flow:**

1. User taps "Take Photo" or "Choose from Library"
2. Check if permission granted
3. If not granted: Show system permission dialog
4. If denied: Show alert explaining why permission is needed + link to Settings
5. If granted: Proceed with camera/library picker

### Data Requirements

**Fetch current profile photo:**

```typescript
const { data } = await supabase
  .from('users')
  .select('profile_photo')
  .eq('id', userId)
  .single();
```

**Upload photo:**

```typescript
const filePath = `${userId}.jpg`;
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(filePath, photoFile, { upsert: true });
```

**Get public URL:**

```typescript
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl(filePath);
```

**Update user profile:**

```typescript
const { error } = await supabase
  .from('users')
  .update({ profile_photo: photoUrl })
  .eq('id', userId);
```

**Delete photo:**

```typescript
const { error } = await supabase.storage
  .from('avatars')
  .remove([`${userId}.jpg`]);

await supabase
  .from('users')
  .update({ profile_photo: null })
  .eq('id', userId);
```

---

## Testing Checklist

### Functional Tests

- [ ] "Change Photo" button opens picker modal
- [ ] "Take Photo" opens camera (with permission)
- [ ] "Choose from Library" opens photo library (with permission)
- [ ] Selected photo navigates to crop screen
- [ ] Crop screen drag/pinch gestures work correctly
- [ ] "Done" on crop screen triggers upload with loading state
- [ ] Successful upload updates avatar and shows "Photo updated!"
- [ ] "Remove Photo" shows confirmation dialog
- [ ] Confirming remove deletes photo and shows initials
- [ ] "Cancel" on modal returns to EditProfileScreen

### Visual Tests

- [ ] Avatar displays correctly (64×64px circle)
- [ ] Initials display with correct trust-level background color
- [ ] Photo picker modal slides up from bottom
- [ ] Crop screen has black background with white crop border
- [ ] Loading spinner overlays avatar correctly
- [ ] Success/error status text appears and fades

### Accessibility Tests

- [ ] VoiceOver/TalkBack reads all elements in correct order
- [ ] Touch targets meet 44pt/48dp minimum
- [ ] Color contrast meets WCAG AA
- [ ] Modal announces correctly as "sheet"
- [ ] Destructive "Remove Photo" announced as destructive action

### Edge Case Tests

- [ ] Image > 5MB: shows error toast
- [ ] Invalid format: shows error toast
- [ ] Network failure during upload: reverts avatar, shows error
- [ ] Permission denied: shows Settings guidance
- [ ] No existing photo: shows "Add Photo" instead of "Change Photo"
- [ ] Rapid taps: button disabled during upload

---

## Related Screens

| Relation | Screen |
|----------|--------|
| Parent | EditProfileScreen (profile management) |
| Uses | Device Camera (system UI) |
| Uses | Photo Library Picker (system UI) |
| Displays on | [09-post-detail.md](../09-post-detail/09-post-detail.md) — author avatar |
| Displays on | [07-conversation-list.md](../07-conversation-list/07-conversation-list.md) — chat avatar |
| Displays on | [06-home-screen-level-0.md](../06-home-screen-level-0/06-home-screen-level-0.md) — post card avatar |

---

**Status:** Draft — Ready for Review
