# Wireframe: Profile Photo Upload

**Screen Number:** 10
**Feature Reference:** [post-likes-and-comments.md](../features/post-likes-and-comments.md) - Feature 3.5
**User Story:** As a user, I want to upload my profile photo so others can recognize me on posts and comments.
**Last Updated:** 2026-02-16  
**Status:** Draft

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

## Visual Layout

### Edit Profile Screen with Photo Section

```
┌─────────────────────────────────────────┐
│  ← Edit Profile                   ✓     │ ← Header: back + save
├─────────────────────────────────────────┤
│                                         │
│                                         │
│               ┌─────┐                   │ ← Profile photo section
│               │     │                   │    (top of EditProfileScreen)
│               │ JD  │                   │    64x64px avatar
│               │     │                   │    Blue background (Level 1)
│               └─────┘                   │
│                                         │
│            [Change Photo]               │ ← Change photo button
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  Full Name                              │ ← Other profile fields below
│  John Doe                               │
│                                         │
│  ...                                    │
│                                         │
└─────────────────────────────────────────┘
```

### Photo Picker Modal (Action Sheet)

```
┌─────────────────────────────────────────┐
│                                         │
│  Select Photo                           │ ← Modal title
│                                         │
│  ┌───────────────────────────────────┐  │
│  │   📷  Take Photo                   │  │ ← Option 1: Camera
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │   🖼️  Choose from Library          │  │ ← Option 2: Photo library
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │ ← Option 3: Remove (if photo exists)
│  │   🗑️  Remove Photo                 │  │    Red text
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │   Cancel                           │  │ ← Cancel button
│  └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

### Image Cropping Screen (After Selection)

```
┌─────────────────────────────────────────┐
│  Cancel                          Done   │ ← Header: cancel + done
├─────────────────────────────────────────┤
│                                         │
│                                         │
│         ┌─────────────────┐             │ ← Image preview
│         │                 │             │    (full width minus padding)
│         │                 │             │    Square crop area overlay
│         │    [IMAGE]      │             │    Draggable + pinch to zoom
│         │                 │             │
│         │                 │             │
│         └─────────────────┘             │
│                                         │
│            ┌───────────┐                │ ← Zoom slider (optional)
│         ───┤────●──────┤────            │
│            └───────────┘                │
│                                         │
│         Drag to reposition              │ ← Help text
│         Pinch to zoom                   │
│                                         │
└─────────────────────────────────────────┘
```

### Upload Loading State

```
┌─────────────────────────────────────────┐
│  ← Edit Profile                         │
├─────────────────────────────────────────┤
│                                         │
│                                         │
│               ┌─────┐                   │
│               │     │                   │ ← Avatar with spinner overlay
│               │  ⏳  │                   │    Uploading indicator
│               │     │                   │
│               └─────┘                   │
│                                         │
│           Uploading photo...            │ ← Status text
│                                         │
├─────────────────────────────────────────┤
│  ...                                    │
│                                         │
└─────────────────────────────────────────┘
```

---

## Component Details

### 1. Profile Photo Display (EditProfileScreen)

**Type:** Circular avatar with button
**Position:** Top of EditProfileScreen, centered
**Margin:** 24px from top, 24px from bottom

#### Avatar Display
**Size:** 64x64px circle
**Border:** 2px solid #E0E0E0
**Content:**
- If photo uploaded: Display profile photo
- If no photo: Display initials (e.g., "JD" for John Doe)
  - Typography: 24pt/22sp Semibold, #FFFFFF (white text)
  - Background color based on trust level:
    - Level 0: #E0E0E0 (Light Gray)
    - Level 1: #4A90E2 (Blue)
    - Level 2: #7B61FF (Purple)

**Interaction:**
- Tap avatar → open photo picker modal (same as "Change Photo" button)

#### Change Photo Button
**Type:** Text button
**Position:** Below avatar, centered
**Margin:** 12px from avatar

**Typography:** 15pt/14sp Semibold, #1565C0 (Primary Blue)
**Text:** 
- If no photo: "Add Photo"
- If photo exists: "Change Photo"
**Underline:** Yes (always visible)
**Touch target:** 44x44pt / 48x48dp minimum

**Interaction:**
- Tap button → open photo picker modal

**Accessibility:** "Change profile photo, button" or "Add profile photo, button"

---

### 2. Photo Picker Modal (Action Sheet)

**Type:** Bottom sheet modal (iOS) / Action Sheet (Android)
**Background:** Semi-transparent black overlay (50% opacity)
**Modal background:** White (#FFFFFF)
**Corner radius:** 16px top corners (iOS)
**Height:** Auto (fits content)

**Modal Title:**
- Text: "Select Photo"
- Typography: 17pt/16sp Semibold, #212121
- Alignment: Center
- Padding: 20px vertical

**Options:**
Each option is a tappable row (56px height):

#### Option 1: Take Photo
- **Icon:** 📷 (camera), 24x24px, #1565C0
- **Label:** "Take Photo" (17pt/16sp Regular, #212121)
- **Action:** Open device camera → capture photo → navigate to crop screen
- **Permissions:** Request camera permission if not granted

#### Option 2: Choose from Library
- **Icon:** 🖼️ (picture frame), 24x24px, #1565C0
- **Label:** "Choose from Library" (17pt/16sp Regular, #212121)
- **Action:** Open photo library picker → select photo → navigate to crop screen
- **Permissions:** Request photo library permission if not granted

#### Option 3: Remove Photo (conditional)
- **Icon:** 🗑️ (trash can), 24x24px, #C62828 (Accent Red)
- **Label:** "Remove Photo" (17pt/16sp Regular, #C62828)
- **Display:** Only shown if user has existing photo
- **Action:** 
  - Show confirmation dialog: "Remove profile photo?"
  - On confirm: Delete photo from Supabase Storage, set `users.profile_photo = null`, update UI to show initials
- **Accessibility:** "Remove profile photo, button, destructive action"

#### Cancel Button
- **Style:** Secondary (gray text)
- **Label:** "Cancel" (17pt/16sp Semibold, #757575)
- **Action:** Close modal, return to EditProfileScreen
- **Separator:** 8px gray divider above cancel button

**States:**
- **Default:** White background, options visible
- **Pressed:** Light gray background (#F5F5F5) on tapped option
- **Closing:** Slide down animation (300ms)

**Accessibility:**
- Modal announced: "Select photo, sheet"
- Each option announced separately
- Swipe down to dismiss (iOS)

---

### 3. Image Cropping Screen

**Type:** Full-screen modal
**Background:** Black (#000000)
**Navigation Bar:** White text on black background

#### Header
**Height:** 44px (iOS) / 56dp (Android)
**Background:** Black (#000000)
**Components:**
- **Cancel button:** "Cancel" (left), white text
  - Action: Discard changes, return to EditProfileScreen
- **Done button:** "Done" (right), white text
  - Action: Proceed to upload
  - Disabled if image not cropped/positioned

#### Image Preview Area
**Background:** Black (#000000)
**Content:**
- Selected image displayed at center
- Square crop overlay (white borders, 2px)
- Corner handles for crop area adjustment (optional, or fixed 1:1 ratio)
- Pan gesture: Drag image to reposition within crop area
- Pinch gesture: Zoom in/out (min 1x, max 3x)

**Crop Area:**
- Fixed 1:1 aspect ratio (square)
- Size: 80% of screen width (maximum)
- Border: 2px white with 50% black overlay outside crop area

#### Help Text (Bottom)
**Typography:** 14pt/13sp Regular, #FFFFFF (white)
**Content:**
- "Drag to reposition"
- "Pinch to zoom"
**Position:** Bottom center, 32px from bottom
**Background:** Semi-transparent black pill (#000000 at 60% opacity), 8px padding

#### Zoom Slider (Optional)
**Position:** Below image, 24px from bottom of preview
**Track:** 200px wide, 4px height, #FFFFFF at 30% opacity
**Thumb:** 24x24px circle, #FFFFFF
**Range:** 1x to 3x zoom
**Interaction:** Drag slider to zoom image

**Actions:**
- **Done button:** Crop image → compress → upload to Supabase Storage
- **Cancel button:** Discard, return to EditProfileScreen

**Accessibility:**
- "Crop profile photo screen"
- "Drag image to position, pinch to zoom"
- "Done button" / "Cancel button"

---

### 4. Upload Loading State

**Display:** On EditProfileScreen during upload

**Changes:**
- Avatar shows spinner overlay:
  - Background: Black (#000000) at 50% opacity over current avatar
  - Spinner: White circular spinner (24x24px)
- Status text below avatar: "Uploading photo..." (13pt Regular, #757575)
- "Change Photo" button disabled (grayed out)
- Save button in header disabled

**Duration:** 2-5 seconds (typical upload time)

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

## Technical Specifications

### Image Processing

**Upload Requirements:**
- **Max file size:** 5MB (before compression)
- **Supported formats:** JPEG, PNG
- **Max dimensions:** 500x500px (after crop and resize)
- **Compression quality:** 80% JPEG quality
- **Target file size:** < 500KB (post-compression)

**Cropping:**
- 1:1 aspect ratio (square)
- Output dimensions: 500x500px
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

---

## Interaction Details

### Happy Path (Upload Photo)
1. User navigates to EditProfileScreen
2. User taps "Change Photo" button
3. Photo picker modal appears
4. User selects "Choose from Library"
5. System checks photo library permission → granted
6. Photo library picker opens (system UI)
7. User selects a photo
8. Image cropping screen appears with selected photo
9. User drags/pinches to position and zoom
10. User taps "Done"
11. System crops image to square
12. System compresses image to < 500KB
13. Loading state: Avatar shows spinner + "Uploading photo..."
14. System uploads to Supabase Storage: `avatars/{userId}.jpg`
15. System updates `users.profile_photo` field with Storage URL
16. Avatar updates to show new photo
17. Status: "Photo updated!" (green text, fades after 2s)
18. User continues editing other profile fields or taps Save

### Alternative Flow (Take Photo)
Steps 1-4 same as above
5. User selects "Take Photo"
6. System checks camera permission → granted
7. Camera opens (system UI)
8. User takes photo
9. Continue steps 8-18 from Happy Path

### Alternative Flow (Remove Photo)
Steps 1-3 same as above
4. User selects "Remove Photo"
5. Confirmation dialog: "Remove profile photo? This will replace your photo with your initials."
6. User taps "Remove"
7. System deletes `avatars/{userId}.jpg` from Supabase Storage
8. System sets `users.profile_photo = null`
9. Avatar updates to show initials
10. Status: "Photo removed" (gray text, fades after 2s)

### Alternative Flow (Permission Denied)
Steps 1-5 same as Happy Path
6. System checks photo library permission → denied
7. Alert dialog:
   - Title: "Photo Library Access Required"
   - Message: "Please grant photo library access in Settings to choose a profile photo."
   - Buttons: "Cancel", "Open Settings"
8. If user taps "Open Settings": Navigate to iOS Settings app, app permissions
9. User manually grants permission → returns to app
10. User repeats flow (now permission granted)

---

## Edge Cases & Error States

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

## Accessibility Requirements

### Screen Reader Support
- EditProfileScreen: "Edit profile. Profile photo, [name initials or photo description]. Change photo button."
- Photo picker modal: "Select photo sheet. Take photo button. Choose from library button. Remove photo button. Cancel button."
- Crop screen: "Crop photo screen. Drag image to position, pinch to zoom. Done button. Cancel button."
- Avatar: "Your profile photo" or "Your initials J D, no photo uploaded"

### Touch Targets
- Avatar: 64x64px ✓ (exceeds minimum)
- Change Photo button: 44x44pt / 48x48dp ✓
- All modal options: 56px height ✓

### Color Contrast
- Button text (#1565C0 on #FFFFFF): 7.2:1 ✓
- Help text (white on black): 21:1 ✓
- Status text (#757575 on #FFFFFF): 4.6:1 ✓

---

## Platform-Specific Differences

| Aspect | iOS | Android |
|--------|-----|---------|
| **Photo Picker** | Bottom sheet | Bottom sheet (Material) |
| **Camera UI** | Native iOS camera | Native Android camera |
| **Photo Library** | Native Photos app picker | System photo picker (Material) |
| **Crop UI** | Manual gestures + slider | Manual gestures + slider |
| **Permissions** | NSPhotoLibraryUsageDescription | READ_EXTERNAL_STORAGE |

---

## Data Requirements

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

## Navigation

**Entry Point:**
- Tap "Change Photo" button on EditProfileScreen

**Exit Points:**
- Tap Save → ProfileScreen (with updated photo)
- Tap Back/Cancel → ProfileScreen (no changes)

**Screen Flow:**
1. EditProfileScreen → Photo Picker Modal → Camera/Library Picker → Crop Screen → EditProfileScreen (with new photo)

---

## Related Screens

**Previous:** [ProfileScreen](./profile-screen.md) → EditProfileScreen  
**Related:** [06-home-screen-level-0.md](./06-home-screen-level-0.md) (avatar in PostCard)  
**Related:** [09-post-detail.md](./09-post-detail.md) (author avatar, comment avatars)

---

## Success Metrics

- 50%+ of Level 1+ users upload a profile photo within 7 days
- < 5% upload failure rate
- Average upload time < 5 seconds
- Users with photos receive 2x more messages (social trust signal)

---

**Wireframe Status:** Draft - Ready for Review
