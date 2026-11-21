# RestroDesk POS — Frontend starter

A React + Tailwind CSS frontend prototype based on the supplied Restaurant BRD and voice-note requirements.

## Run it
1. Install Node.js (LTS).
2. Extract this ZIP and open the `RestroDesk-Frontend` folder in VS Code.
3. Open terminal in that folder and run:
   ```bash
   npm install
   npm run dev
   ```
4. Open the local URL printed by Vite (usually http://localhost:5173).

## Demo login
- Owner: `owner@spicegarden.com`
- Admin: `admin@restrodesk.com`
- Password: any non-empty value (demo only).

## Included frontend screens
- Role selection / login (software Admin and Restaurant Owner)
- Owner dashboard and daybook
- POS billing: dine-in/takeaway/delivery, item search, variants, quantity, discount, GST preview, payment methods
- Invoice preview and browser print
- Menu & GST setup with categories, Half/Full/custom variants and availability
- Expenses and purchases ledger
- Staff and salary advances / carry-forward view
- Sales, P&L and GST reports
- Restaurant settings, local backup export
- Admin restaurant account and subscription screen
- Subscription expiry / renewal state demo

## Important architecture notes
This ZIP contains **frontend only**. It uses browser `localStorage` as a temporary demo store so you can test the screens. It does not include a secure login server, SQLite database, Electron desktop packaging, or real subscription API.

For the intended product:
- React + Tailwind = user interface.
- Electron = Windows desktop application shell.
- SQLite = persistent local restaurant database.
- Node.js/Express online API = admin accounts and subscription activation/renewal.
- Daily restaurant operations should work offline. Internet is required for first activation and subscription renewal.
- A frontend-only date countdown is not secure. Production licensing should use server-issued digitally signed licenses, trusted timestamps, clock rollback checks and periodic online verification. A fully offline PC cannot perfectly prove real-world time if its system clock is manipulated.
- Subscription expiry must lock usage without deleting restaurant data.
- Keep salary advances and payments as ledger entries; do not overwrite history.
- Tax rates are configurable (0%, 5%, 12%, 18% per BRD); verify applicable tax treatment before production use.
- Sales are already income; avoid double-counting sales as separate income entries.

This is a starter UI, not a production accounting or tax-compliance system.
