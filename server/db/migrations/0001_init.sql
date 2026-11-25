-- RestroDesk: restaurants (account + plan + linked device) and payments (revenue).
-- All times are Unix epoch milliseconds, same as the frontend (Date.now()).

CREATE TABLE restaurants (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  owner_name      TEXT NOT NULL,
  mobile          TEXT NOT NULL UNIQUE,          -- 10 digits
  email           TEXT NOT NULL UNIQUE,          -- lower case
  password_hash   TEXT NOT NULL,                 -- pbkdf2$iterations$salt$hash (never plain text)
  plan_type       TEXT NOT NULL DEFAULT 'period' CHECK (plan_type IN ('period', 'lifetime')),
  duration_days   INTEGER,                       -- NULL for lifetime
  created_at      INTEGER NOT NULL,
  activated_at    INTEGER,                       -- first login: the plan starts here
  expires_at      INTEGER,                       -- NULL for lifetime, or plan not started yet
  device_id       TEXT,                          -- 1 account = 1 device
  device_bound_at INTEGER,
  last_seen_at    INTEGER
);

CREATE TABLE payments (
  id              TEXT PRIMARY KEY,
  restaurant_id   TEXT,                          -- no FOREIGN KEY on purpose: revenue history survives deleting a restaurant
  restaurant_name TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'new' CHECK (type IN ('new', 'renewal', 'upgrade', 'other')),
  plan            TEXT NOT NULL DEFAULT '',
  amount          REAL NOT NULL CHECK (amount >= 0),
  method          TEXT NOT NULL DEFAULT 'UPI',
  note            TEXT NOT NULL DEFAULT '',
  paid_on         INTEGER NOT NULL,
  created_at      INTEGER NOT NULL
);

CREATE INDEX idx_payments_paid_on ON payments (paid_on DESC);
CREATE INDEX idx_payments_restaurant ON payments (restaurant_id);