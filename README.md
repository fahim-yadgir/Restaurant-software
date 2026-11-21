# RestroDesk POS — Restaurant Billing & Subscription Platform (Frontend)

A local-first restaurant POS. The **Platform Admin** (software owner) registers restaurants and issues activation codes; each **Restaurant Owner** activates the app once, then runs billing, menu, expenses, staff and reports offline until the subscription expires.

> **Status: frontend prototype.** There is no backend or desktop shell yet. Everything (restaurant registry, device license, menu, bills, expenses, staff) lives in browser `localStorage`. Auth and licensing are demo-grade. See [Known limitations](#known-limitations).

## 1. Current technology stack
| Layer | Technology |
|---|---|
| Frontend | React.js 18 |
| Build tool | Vite 6 |
| Programming language | JavaScript (JSX) |
| Styling | Tailwind CSS 3 |
| Icons | Lucide React |
| Charts | Recharts |
| Local data storage | Browser LocalStorage |
| Offline caching | Service Worker |
| Package manager | npm |

## 2. Planned backend and desktop stack
Recommended for the full offline-first product. **Not implemented yet** (`electron/` and `server/` hold the plan only).
| Layer | Recommended technology |
|---|---|
| Desktop application | Electron |
| Local database | SQLite |
| Backend API | Node.js + Express.js |
| Online database | PostgreSQL |
| Authentication | Server-side authentication |

## Run
```bash
npm install
npm run dev        # http://localhost:5173
npm run build
npm run preview
```
Imports use the `@` alias for `src/` (e.g. `import Button from '@/components/ui/Button'`), configured in `vite.config.js` and `jsconfig.json`.

## Roles
| Role | Who | Login | Home |
|---|---|---|---|
| Platform Admin | Software owner | `/admin/login` (demo: `admin@restrodesk.com` / `demo123`) | `/admin` |
| Restaurant Owner | Owns one restaurant | `/` → activate → sign in with registered email/mobile + password | owner dashboard |

Each role has its own route module (`src/app/AdminRoutes.jsx`, `src/app/OwnerRoutes.jsx`). `src/app/App.jsx` holds the shared state and the gates (admin login, activation, subscription check, owner login).

### Pages per role
- **Admin** — Overview, Restaurants & Plans (register, renew, reset password, delete if not activated)
- **Owner** — Dashboard, Billing, Menu & GST, Expenses, Staff, Reports, Daybook, Settings (restaurant, owner and subscription details)

## Workflow (end to end)
1. **Admin registers a restaurant** — restaurant name, owner name, mobile, email, subscription duration, owner password → a unique activation code `RD-XXXX-XXXX` is generated. *Copy details to send* prepares the message for the owner.
2. **Restaurant activates** — enters the code → the registered restaurant and owner details are shown → on confirm the subscription countdown starts (duration set by the admin).
3. **Owner signs in** with the registered email or mobile and password (checked against the device license, so it works offline). The remaining time shows in the top bar and Settings; a banner appears in the last 7 days.
4. **Expiry** — operational screens lock, saved data is preserved, and the owner sees the contact details from `src/lib/appConfig.js`. After the admin renews, the owner taps *Check for renewal*. There is no self-renew.

## Project structure
```
src/
  app/          App.jsx (state + gates), AdminRoutes.jsx, OwnerRoutes.jsx
  pages/
    admin/        OverviewPage, RestaurantsPage
    auth/         LoginPage (owner), AdminLoginPage
    setup/        SetupPage (activation)
    subscription/ SubscriptionPage (expired / locked)
    owner/        Dashboard, Billing, Menu, Expenses, Staff, Reports, Daybook, Settings
  components/
    ui/           Button, Field, Badge, CopyButton
    layout/       AppLayout, Sidebar, Topbar
    admin/        RestaurantRow, StatusBadge
    billing/ dashboard/ menu/   owner-side components
  lib/          registry.js (restaurants, codes, password hashing, status), license.js (device license, trusted clock),
                localStore.js, appConfig.js (support contacts, plan durations), format.js, demoData.js
  hooks/        usePersistentState, useOnlineStatus, useTrustedClock
  features/     future feature modules (see features/README.md)
  styles/       index.css
public/sw.js    service worker (offline app shell)
electron/       planned desktop shell (README only)
server/         planned Express + PostgreSQL API (README only)
TESTING.md      manual test checklist
```

### Storage keys
`rd_registry` (admin's restaurant records) · `rd_license` (this device's license + owner login hash) · `rd_role` (owner session) · `rd_admin_session` (sessionStorage, admin) · `rd_last_seen` (clock rollback guard) · `rd_foods`, `rd_expenses`, `rd_staff`, `rd_bills` (restaurant data). Clear these to reset the demo.

## Known limitations
- The registry and the license are in the same browser's localStorage, so admin and restaurant must use the **same browser profile** for activation to find the code. Separate computers need the backend in `server/`.
- Admin login is hard-coded. Owner passwords are salted SHA-256 hashes in the browser: demo-grade only.
- Clearing browser storage or editing it resets or alters a license. Production needs a server-signed license. A PC clock set backwards is ignored (`trustedNow()`), nothing more.
- Business data is in localStorage, not SQLite, and is tied to the browser profile.
- Payments, invoice PDF export and printing beyond the browser dialog are not implemented.
- No automated tests are included; follow `TESTING.md`.

## Next steps
1. Build `server/` (Express + PostgreSQL): admin auth, restaurants, activation, renewal, owner login, signed licenses.
2. Wrap the app in Electron (`electron/`) and move restaurant data from localStorage to SQLite.
3. Replace the functions in `src/lib/registry.js` and the activation/renewal handlers in `src/app/App.jsx` with API calls.
4. Add payments, invoice PDF export and automated tests.
