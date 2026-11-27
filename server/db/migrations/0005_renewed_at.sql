-- When the admin last renewed this restaurant (epoch ms). NULL = never renewed.
ALTER TABLE restaurants ADD COLUMN renewed_at INTEGER;