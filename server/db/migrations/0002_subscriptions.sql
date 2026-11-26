-- Every plan a restaurant has ever had (new, renewal, upgrade). The latest row is the current plan.
CREATE TABLE subscriptions (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  plan_type     TEXT NOT NULL CHECK (plan_type IN ('period', 'lifetime')),
  duration_days INTEGER,                 -- NULL for lifetime
  starts_at     INTEGER,                 -- NULL until the owner's first login starts the plan
  ends_at       INTEGER,                 -- NULL for lifetime, or plan not started yet
  payment_id    TEXT,                    -- the payments row that paid for it (optional)
  created_at    INTEGER NOT NULL
);

CREATE INDEX idx_subscriptions_restaurant ON subscriptions (restaurant_id, created_at DESC);