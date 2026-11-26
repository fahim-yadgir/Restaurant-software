-- Admin tokens that were signed out before they expired. Checked on every admin request.
CREATE TABLE revoked_tokens (
  jti        TEXT PRIMARY KEY,   -- the token's unique id
  expires_at INTEGER NOT NULL    -- when the token would have expired anyway (epoch ms); the row can be deleted after this
);

CREATE INDEX idx_revoked_tokens_expires ON revoked_tokens (expires_at);