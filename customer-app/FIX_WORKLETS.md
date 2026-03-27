# Fix Worklets Version Mismatch

## Option 1: Clear Cache and Rebuild (Recommended)

1. Stop the Expo server (Ctrl+C)

2. Clear all caches:

```bash
cd /Volumes/Data/Marketplace/localito/customer-app
rm -rf .expo node_modules/.cache .metro
npm cache clean --force
```

3. Reinstall dependencies:

```bash
npm install
```

4. If using Expo Go:
   - Close and reopen Expo Go app
   - Restart: `npx expo start --clear`

5. If using Development Build:
   - Rebuild the app:
     - iOS: `npx expo run:ios`
     - Android: `npx expo run:android`

## Option 2: Downgrade worklets (if Option 1 doesn't work)

```bash
npm install react-native-worklets@0.5.1
npx expo start --clear
```

## Option 3: Remove reanimated temporarily (if not using animations)

If you're not using reanimated features yet, you can temporarily remove the import:

- Comment out `import 'react-native-reanimated';` in `app/_layout.tsx`
