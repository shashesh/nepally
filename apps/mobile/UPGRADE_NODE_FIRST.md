# ⚠️ CRITICAL: Upgrade Node.js First

## Current Issue

You're getting this error:
```
[runtime not ready]: Invariant Violation:
TurboModuleRegistry.getEnforcing(...): 'PlatformConstants' could not be found
```

## Root Cause

- **Your Node version:** 16.20.2
- **Required Node version:** 18.0.0 or higher
- **Expo SDK 54** requires Node 18+

The native modules can't load properly because they were compiled with an incompatible Node version.

## Solution: Upgrade Node.js

### Windows (using nvm-windows)

1. **Install nvm-windows** (if not already):
   - Download from: https://github.com/coreybutler/nvm-windows/releases
   - Install `nvm-setup.exe`

2. **Open PowerShell as Administrator** and run:
   ```powershell
   # Install Node 18 LTS
   nvm install 18

   # Use Node 18
   nvm use 18

   # Verify installation
   node --version
   # Should show: v18.x.x
   ```

### Windows (direct download)

1. Download Node.js LTS from: https://nodejs.org/
2. Run installer
3. Restart your terminal/computer
4. Verify: `node --version`

---

## After Upgrading Node

### 1. Navigate to project
```bash
cd C:\Users\shash\Documents\personal-github-repos\unhn
```

### 2. Clean everything
```bash
# Root level
rm -rf node_modules
rm package-lock.json

# Mobile app
cd apps/mobile
rm -rf node_modules
rm package-lock.json
rm -rf .expo
```

### 3. Reinstall dependencies
```bash
# From mobile directory
npm install
```

### 4. Start the app
```bash
npx expo start --port 8082 --clear
```

### 5. Test on Android
- Open Expo Go
- Scan QR code
- Should now load without errors!

---

## Why This Happens

Expo SDK versions and Node.js versions must match:

| Expo SDK | Min Node Version |
|----------|------------------|
| SDK 50   | Node 16+        |
| SDK 51   | Node 18+        |
| **SDK 54** | **Node 18+**   |

You're using SDK 54 with Node 16 → Native modules fail to load.

---

## Alternative: Downgrade Expo (Not Recommended)

If you absolutely cannot upgrade Node:

```bash
cd apps/mobile

# Downgrade to Expo SDK 50
npm install expo@^50.0.0

# Reinstall dependencies
rm -rf node_modules
npm install

# Start
npx expo start --clear
```

**Note:** This will limit features and may cause other compatibility issues.

---

## Verification Checklist

After upgrading Node:

- [ ] `node --version` shows 18.x.x or higher
- [ ] `npm --version` shows 9.x.x or higher
- [ ] Deleted all `node_modules` folders
- [ ] Deleted all `package-lock.json` files
- [ ] Ran `npm install` fresh
- [ ] Started with `--clear` flag
- [ ] Android app loads in Expo Go

---

## Still Having Issues?

If you upgrade Node and still get errors:

1. Make sure you **restarted your terminal** after Node upgrade
2. Verify Node version: `node --version`
3. Try deleting `.expo` folder: `rm -rf .expo`
4. Try updating Expo Go app on your phone

---

**Bottom Line:** Upgrade to Node 18+ and the error will disappear!
