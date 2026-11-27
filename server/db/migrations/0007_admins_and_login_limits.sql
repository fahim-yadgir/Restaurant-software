-- The platform admin now lives in the database, so the password can be changed from the Account page.
-- On the first login the row is created from ADMIN_EMAIL / ADMIN_PASSWORD (wrangler vars / secret);
-- after that the password in the database is the one that counts.
CREATE TABLE admins (
  id                  TEXT PRIMARY KEY,
  email               TEXT NOT NULL UNIQUE,
  password_hash       TEXT NOT NULL,
  password_changed_at INTEGER NOT NULL,   -- epoch ms; saved inside every login token, so changing the password signs out all old tokens
  created_at          INTEGER NOT NULL
);

-- Wrong-password counter per visitor (IP address): too many failures -> locked for a while.
CREATE TABLE login_attempts (
  key             TEXT PRIMARY KEY,       -- e.g. 'login:203.0.113.5'
  failures        INTEGER NOT NULL,
  first_failed_at INTEGER NOT NULL,
  locked_until    INTEGER                 -- epoch ms, NULL = not locked
);