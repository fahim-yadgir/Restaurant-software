-- Email is now optional. SQLite cannot drop NOT NULL from a column, so the table is rebuilt.
-- UNIQUE still works: any number of restaurants may have no email (NULL), but two cannot share one.
CREATE TABLE restaurants_new (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  owner_name      TEXT NOT NULL,
  mobile          TEXT NOT NULL UNIQUE,
  email           TEXT UNIQUE,
  password_hash   TEXT NOT NULL,
  plan_type       TEXT NOT NULL DEFAULT 'period' CHECK (plan_type IN ('period', 'lifetime')),
  duration_days   INTEGER,
  created_at      INTEGER NOT NULL,
  activated_at    INTEGER,
  expires_at      INTEGER,
  device_id       TEXT,
  device_bound_at INTEGER,
  last_seen_at    INTEGER
);

INSERT INTO restaurants_new
  (id, name, owner_name, mobile, email, password_hash, plan_type, duration_days,
   created_at, activated_at, expires_at, device_id, device_bound_at, last_seen_at)
SELECT
  id, name, owner_name, mobile, NULLIF(email, ''), password_hash, plan_type, duration_days,
  created_at, activated_at, expires_at, device_id, device_bound_at, last_seen_at
FROM restaurants;

DROP TABLE restaurants;
ALTER TABLE restaurants_new RENAME TO restaurants;