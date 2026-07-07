ALTER TABLE items ADD COLUMN user_email TEXT NOT NULL DEFAULT 'owner@example.com';

CREATE INDEX idx_items_user_email_purchased ON items(user_email, purchased);
