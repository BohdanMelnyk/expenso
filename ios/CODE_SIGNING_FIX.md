# iOS Code Signing Fix

## Problem

Error when installing ExpensoApp on physical iPhone:
```
Unable to Install "ExpensoApp"
Failed to verify code signature: 0xe8008015
(A valid provisioning profile for this executable was not found.)
```

## Root Cause

iOS apps require proper code signing to run on physical devices. This is Apple's security mechanism to ensure only authorized apps run on iPhones/iPads.

**You need:**
- An Apple Developer Account (free or paid)
- Proper code signing certificate
- Valid provisioning profile
- Device registered in your developer account

## Solution: Configure Code Signing in Xcode

### Option 1: Automatic Signing (Recommended - Easiest)

1. **Open the Xcode Project**
   - Navigate to: `/Users/bohdanmelnyk/workspace/vibe-coding/expenso/ios/ExpensoApp/`
   - Open `ExpensoApp.xcodeproj` in Xcode

2. **Select the Project**
   - Click on `ExpensoApp` in the Project Navigator (left sidebar)
   - Select the `ExpensoApp` target under "TARGETS"

3. **Configure Signing & Capabilities Tab**
   - Click on the "Signing & Capabilities" tab
   - Check the box: ✅ **"Automatically manage signing"**

4. **Select Your Team**
   - Click the "Team" dropdown
   - Select your Apple ID team
   - If you don't see your team:
     - Click "Add an Account..."
     - Sign in with your Apple ID
     - Select your team after signing in

5. **Update Bundle Identifier (if needed)**
   - Change the Bundle Identifier to something unique
   - Example: `com.yourname.ExpensoApp`
   - Must be unique across all apps

6. **Connect Your iPhone**
   - Plug in your iPhone via USB
   - Trust the computer on your iPhone if prompted
   - Wait for Xcode to process the device

7. **Build and Run**
   - Select your iPhone from the device dropdown (top toolbar)
   - Click the Run button (▶️) or press Cmd+R
   - First time: Xcode will register the device and create profiles (takes 1-2 min)

### Option 2: Manual Signing (Advanced)

If automatic signing doesn't work or you have a paid developer account:

1. **Create Certificates (Apple Developer Portal)**
   - Go to: https://developer.apple.com/account/
   - Navigate to: Certificates, Identifiers & Profiles
   - Create an iOS Development Certificate
   - Download and install the certificate

2. **Register Your Device**
   - In Apple Developer Portal
   - Go to: Devices
   - Click the + button
   - Add your device's UDID (found in Xcode → Window → Devices and Simulators)

3. **Create Provisioning Profile**
   - In Apple Developer Portal
   - Go to: Profiles
   - Create a new iOS App Development profile
   - Select your App ID, Certificate, and Device
   - Download the profile
   - Double-click to install in Xcode

4. **Configure in Xcode**
   - Uncheck "Automatically manage signing"
   - Select your provisioning profile manually
   - Select your signing certificate

## Quick Fix Checklist

### Step 1: Check Your Apple ID in Xcode
```
Xcode → Settings (Cmd+,) → Accounts
- Ensure your Apple ID is added
- Click "Download Manual Profiles" if using manual signing
```

### Step 2: Trust Your Computer on iPhone
```
iPhone → Settings → General → Device Management
- Trust the developer certificate
- Trust the computer
```

### Step 3: Update Bundle Identifier
```
Xcode → Project → Target → General
- Change Bundle Identifier to: com.yourname.ExpensoApp
- Must be unique!
```

### Step 4: Clean Build Folder
```
Xcode → Product → Clean Build Folder (Shift+Cmd+K)
Then: Product → Build (Cmd+B)
```

## Troubleshooting

### Error: "No signing certificate found"

**Solution:**
1. Open Xcode → Settings → Accounts
2. Select your Apple ID
3. Click "Manage Certificates"
4. Click the + button
5. Select "Apple Development"
6. Certificate will be created automatically

### Error: "Device not registered"

**Solution:**
1. Connect iPhone to Mac
2. Xcode → Window → Devices and Simulators
3. Right-click device → Show Identifier
4. If using manual signing, register this UDID at developer.apple.com

### Error: "Bundle identifier already in use"

**Solution:**
Change the Bundle Identifier in Xcode:
```
General tab → Identity → Bundle Identifier
Change from: com.yourcompany.ExpensoApp
To: com.yourname.ExpensoApp (or anything unique)
```

### Error: "Provisioning profile expired"

**Solution:**
1. Delete old profiles:
   ```bash
   rm -rf ~/Library/MobileDevice/Provisioning\ Profiles/*
   ```
2. In Xcode, enable/disable automatic signing to regenerate

## Free vs Paid Apple Developer Account

### Free Account (Personal Team)
✅ Can test on your own devices
✅ Automatic signing works
✅ 7-day app validity (re-sign weekly)
❌ Cannot distribute to App Store
❌ Limited to 3 devices

### Paid Account ($99/year)
✅ Can test on unlimited devices
✅ Can distribute to App Store/TestFlight
✅ Apps remain valid for 1 year
✅ Advanced capabilities (Push Notifications, etc.)

## Alternative: Run on Simulator

If you just want to test the app without dealing with signing:

1. **Select Simulator**
   - In Xcode device dropdown, select any iPhone simulator
   - Example: "iPhone 15 Pro"

2. **Run**
   - Click Run (▶️) or press Cmd+R
   - Simulator will launch automatically
   - No signing required for simulators

3. **Limitations**
   - Cannot test device-specific features (camera, GPS)
   - Performance may differ from real device
   - Network behavior may differ

## Step-by-Step: First Time Setup (Most Common)

### 1. Open Xcode Project
```bash
cd /Users/bohdanmelnyk/workspace/vibe-coding/expenso/ios/ExpensoApp/
open ExpensoApp.xcodeproj
```

### 2. Add Your Apple ID
- Xcode → Settings (Cmd+,)
- Click "Accounts" tab
- Click + button → "Apple ID"
- Sign in with your Apple ID

### 3. Enable Automatic Signing
- Select ExpensoApp project in left sidebar
- Select ExpensoApp target
- Click "Signing & Capabilities" tab
- ✅ Check "Automatically manage signing"
- Select your Team from dropdown

### 4. Change Bundle ID (Make it Unique)
- In the same screen under "Bundle Identifier"
- Change to: `com.bohdanmelnyk.ExpensoApp`

### 5. Connect Your iPhone
- Plug iPhone into Mac via cable
- Unlock iPhone
- Tap "Trust" on iPhone when prompted
- Wait for Xcode to prepare the device

### 6. Build and Run
- Select your iPhone from device dropdown (top of Xcode)
- Click Run button (▶️)
- Wait for build and install
- First time may take 2-3 minutes

### 7. Trust Developer on iPhone (First Time Only)
- iPhone → Settings → General → VPN & Device Management
- Tap on your developer certificate
- Tap "Trust [Your Name]"
- Tap "Trust" again to confirm

### 8. Run Again
- Now the app should launch successfully!

## Common Mistakes

### ❌ Mistake 1: Forgot to Trust Computer
**Fix:** On iPhone, when you connect, tap "Trust This Computer"

### ❌ Mistake 2: Using Same Bundle ID as Another App
**Fix:** Make your Bundle ID unique (add your name or number)

### ❌ Mistake 3: iPhone Not in Developer Mode (iOS 16+)
**Fix:**
- iPhone → Settings → Privacy & Security
- Scroll down → Developer Mode
- Turn it ON
- Restart iPhone

### ❌ Mistake 4: Certificate Expired
**Fix:**
- Xcode → Settings → Accounts
- Select account → Manage Certificates
- Delete old certificates
- Create new "Apple Development" certificate

## Testing the Fix

After configuring signing:

1. ✅ App builds without errors
2. ✅ App installs on iPhone
3. ✅ App launches successfully
4. ✅ No signing errors in Xcode

## Additional Resources

- [Apple Developer Program](https://developer.apple.com/programs/)
- [Code Signing Guide](https://developer.apple.com/support/code-signing/)
- [Xcode Help: Signing](https://help.apple.com/xcode/mac/current/#/dev60b6fbbc7)
- [Fix Code Signing Issues](https://developer.apple.com/support/code-signing/)

## Still Having Issues?

### Check Xcode Console for Details
```
View → Debug Area → Show Debug Area (Cmd+Shift+Y)
Look for specific error messages
```

### Reset Signing Settings
```bash
# Clean derived data
rm -rf ~/Library/Developer/Xcode/DerivedData

# Clean provisioning profiles
rm -rf ~/Library/MobileDevice/Provisioning\ Profiles/*

# Restart Xcode
```

### Contact Apple Support
If all else fails, Apple Developer Support can help with signing issues:
- https://developer.apple.com/contact/

## Summary

**For most developers (Free Account):**
1. Open project in Xcode
2. Enable "Automatically manage signing"
3. Select your Apple ID team
4. Change Bundle ID to be unique
5. Connect iPhone and trust computer
6. Build and run (Cmd+R)
7. Trust developer certificate on iPhone
8. Done! 🎉

This should resolve your code signing issue and let you run the app on your physical iPhone device.
