# electron/  (planned — not implemented)

Desktop shell for the counter PC.

Planned layout:
```
electron/
  main.js        window creation, app lifecycle, auto-update
  preload.js     safe bridge exposed to the React app (contextBridge)
  db/            SQLite (e.g. better-sqlite3): schema, migrations, queries
  ipc/           handlers: bills, menu, expenses, staff, backup/restore
```
Goals: serve the built Vite app, keep all restaurant data in a local SQLite file, work fully offline after activation, and call the online API only for activation, renewal and login sync.
Until this exists, restaurant data is stored in browser localStorage (see `src/app/OwnerRoutes.jsx`).
