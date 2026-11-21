# RestroDesk POS

React + Vite restaurant POS frontend, organized for future growth and designed to keep daily operations local-first.

## Run
```bash
npm install
npm run dev
```
Build and preview:
```bash
npm run build
npm run preview
```

## First-run demo setup
1. Open the app while connected to the internet.
2. Complete the restaurant setup form.
3. Demo activation code: `RD-DEMO-365`.
4. Sign in using the demo login screen (Owner or Software Admin; any non-empty password).
5. Owner operations are stored in this browser's localStorage and can run without a network connection after the app has been loaded/cached.

The demo license lasts 365 days from setup. The app displays a live days/hours/minutes/seconds countdown. When it expires, owner operations are locked and the user is asked to contact the software owner. The demo renewal action restarts the 365-day period.

## Current limitations — read before commercial use
This ZIP is a frontend demo, not a production-ready offline desktop POS:
- Login is currently demo/local UI, not secure server authentication.
- The activation code is hard-coded for demonstration. No real online activation or renewal API is connected.
- License dates are stored in browser localStorage. Users can manipulate browser storage or the device clock; this is not secure licensing.
- Business data uses browser localStorage, not SQLite. It is tied to this browser profile and can be cleared.
- The service worker caches the app shell/assets for offline reopening after the first successful online load. Browser storage limits and cache eviction still apply.
- To ship a robust Windows offline application, package with Electron or Tauri and use SQLite for local data. Keep network requests limited to authentication, first activation, and renewal. The licensing server should issue a cryptographically signed license, with device binding, trusted-time/rollback checks, and server-side renewal validation.
- Before deployment, add real backend endpoints for login, setup/activation, and renewal. Never rely on a frontend-only password, activation code, or timer for commercial access control.

## Project structure
```text
src/
  app/
    App.jsx
  components/
    billing/
    dashboard/
    layout/
    menu/
    ui/
  data/
    demo.js
  pages/
    AdminPage.jsx
    BillingPage.jsx
    DashboardPage.jsx
    DaybookPage.jsx
    ExpensesPage.jsx
    LoginPage.jsx
    MenuPage.jsx
    ReportsPage.jsx
    SettingsPage.jsx
    SetupPage.jsx
    StaffPage.jsx
    SubscriptionPage.jsx
  services/
    license.js
    localStore.js
  styles/
    index.css
  main.jsx
public/
  sw.js
```
