# server/  (planned — not implemented)

Node.js + Express.js API with a PostgreSQL database and server-side authentication.

Planned layout:
```
server/
  src/
    routes/        auth, restaurants, activation, subscriptions
    controllers/
    middleware/    auth (sessions/JWT), validation, rate limiting
    db/            PostgreSQL schema + migrations
    services/      license signing, password hashing (bcrypt/argon2)
```

## What replaces what
| Frontend demo (today) | API (planned) |
|---|---|
| `createRestaurantRecord` + `rd_registry` (admin form) | `POST /api/admin/restaurants` |
| `renewRecord` | `POST /api/admin/restaurants/:id/renew` |
| `resetPassword` in `App.jsx` | `POST /api/admin/restaurants/:id/reset-password` |
| `lookupActivation` | `POST /api/activation/verify` |
| `activateRestaurant` | `POST /api/activation/confirm` → returns a **signed license** |
| owner login check in `LoginPage` | `POST /api/auth/owner/login` (online first time; cached offline) |
| `checkRenewal` | `GET /api/license/refresh` |
| admin login (hard-coded) | `POST /api/auth/admin/login` |

Rules for the real version: generate and store activation codes server-side, hash passwords with bcrypt/argon2, sign licenses (expiry, restaurant id, device id), and validate time on the server.
