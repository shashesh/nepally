# Nepally Mobile Assets

This directory contains app icons, splash screens, and other assets.

## Required Files

- `icon.png` - App icon (1024x1024px)
- `adaptive-icon.png` - Android adaptive icon (1024x1024px)
- `splash.png` - Splash logo, drawn centred by the `expo-splash-screen` plugin (see below)
- `favicon.png` - Web favicon (48x48px)

## Temporary Placeholders

For development, we're using simple colored placeholders.
Replace these with actual Nepally branded assets before production.

## Icon Requirements

### icon.png
- Size: 1024x1024px
- Background: Nepally Blue (#1565C0)
- Text: "Nepally" in white

### adaptive-icon.png
- Size: 1024x1024px
- Safe area: 432x432px circle in center (Android will crop to circle)
- Background: White
- Foreground: Nepally logo

### splash.png
- Not a full-screen image. The `expo-splash-screen` plugin in `app.json` draws it centred and 200 wide (`imageWidth`) on top of its `backgroundColor`, Nepally Blue (#1565C0)
- Supply a square logo with a transparent background (1024x1024px is plenty)
- Change the size or background in the plugin config in `app.json`, not in the image

## Creating Icons

You can use:
- Figma: Design and export at required sizes
- https://www.appicon.co/ - Generate all sizes from one image
- https://icon.kitchen/ - Create Android adaptive icons
