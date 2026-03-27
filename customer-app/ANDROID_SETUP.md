# Run on Android Studio

This app is an **Expo (React Native)** project. To run it from **Android Studio** you open the native `android` project; Gradle will use the parent folder for Node/Metro.

---

## 1. Open the project in Android Studio

1. Open **Android Studio**.
2. **File → Open** (or "Open an Existing Project").
3. Go to your repo and select the **`android`** folder inside the app:
   ```
   localito-repo/customer-app/android
   ```
   Do **not** open `localito-repo` or `customer-app` alone — open `customer-app/android` so Android Studio sees the Gradle project.
4. Click **OK**. Let Android Studio sync Gradle (first time can take a few minutes).

---

## 2. Use JDK 17

The project needs **JDK 17** (64-bit). If the build fails with Java or Gradle errors:

1. **Install JDK 17**  
   [Adoptium Temurin 17 (Windows x64)](https://adoptium.net/temurin/releases/?version=17&os=windows&arch=x64) — use the **x64** build, not x86.

2. **Point Android Studio to it**  
   **File → Settings** (or **Android Studio → Preferences** on Mac) → **Build, Execution, Deployment → Build Tools → Gradle**
   - Set **Gradle JDK** to **JDK 17** (or "Download JDK 17" if offered).

3. **Optional: set JAVA_HOME** (for CLI builds)  
   In PowerShell:
   ```powershell
   $env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot"
   ```
   Adjust the path to match your JDK 17 install.

---

## 3. Start an emulator

- **Tools → Device Manager** (or **View → Tool Windows → Device Manager**).
- Create or pick an AVD (e.g. Pixel 6, API 34) and **Run** (play button) so the emulator is running before you run the app.

---

## 4. Run the app from Android Studio

1. In the toolbar, pick your **device/emulator** from the run target dropdown.
2. Click the green **Run** button (or **Run → Run 'app'**).

First run will build the native app and install it; later runs are quicker. The app uses **Expo dev client** and will try to load the JS bundle from Metro (see step 5).

---

## 5. Start Metro (so the app loads JS)

The app needs **Metro** to serve the JavaScript bundle. In a terminal:

```bash
cd localito-repo/customer-app
npm install
npx expo start
```

Keep this running. When you launch the app from Android Studio, it will connect to Metro and load the UI. You can also run the app from this terminal with **`npx expo run:android`** instead of using Android Studio's Run button.

---

## 6. API URL (emulator → your backend)

On the emulator, `localhost` is the emulator, not your PC. So the app must call your machine's IP:

1. Get your PC's IP, e.g. `ipconfig` → IPv4 (e.g. `192.168.0.3`).
2. In `customer-app` create or edit **`.env.local`**:
   ```
   EXPO_PUBLIC_API_URL=http://192.168.0.3:5000/api
   ```
   Replace with your IP. Restart Metro after changing env.
3. Run your backend so it's reachable on that IP and port:
   ```bash
   cd localito-repo/server
   npm run dev
   ```

---

## Summary

| Step                   | Action                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| Open in Android Studio | **File → Open** → `customer-app/android`                                                             |
| JDK                    | Use **JDK 17** in **Gradle JDK** (Settings → Build Tools → Gradle)                                   |
| Emulator               | Start an AVD from Device Manager                                                                     |
| Run app                | Green **Run** in Android Studio (or `npx expo run:android` in terminal)                              |
| Metro                  | In `customer-app`: `npx expo start` (keep running)                                                   |
| Backend                | In `server`: `npm run dev`; set `EXPO_PUBLIC_API_URL` in `.env.local` to `http://<your-ip>:5000/api` |

---

## Stuck on "Loading from 10.0.2.2:8081..."

If the app stays on a white screen with "Loading from 10.0.2.2:8081...":

1. **Forward port 8081** (run once per emulator boot):  
   `adb reverse tcp:8081 tcp:8081`

2. **Start Metro so the emulator can reach it:**  
   `npm run start:android`  
   (or `npx expo start --host lan --port 8081`)

3. **Allow port 8081 in Windows Firewall** (if needed):  
   Run PowerShell as Administrator:  
   `New-NetFirewallRule -DisplayName "Metro 8081" -Direction Inbound -LocalPort 8081 -Protocol TCP -Action Allow`

4. **Restart the app:**  
   Force-stop and open the app again, or shake the device (Ctrl+M in emulator) → Reload.
