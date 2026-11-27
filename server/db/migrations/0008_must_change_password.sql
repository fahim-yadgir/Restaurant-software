-- The admin gives every restaurant a temporary password (at register and at reset).
-- 1 = the owner must choose their own password at the next sign-in; set to 0 once they do.
ALTER TABLE restaurants ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 1;