-- Mr.Wide LINE認証用テーブル追加
-- Supabase Dashboard > SQL Editor で実行

CREATE TABLE wide_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id VARCHAR(64) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  picture_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ DEFAULT NOW()
);

-- キーとユーザーの紐付け
ALTER TABLE wide_access_keys ADD COLUMN line_user_id VARCHAR(64);
ALTER TABLE wide_access_keys ADD COLUMN activated_at TIMESTAMPTZ;

CREATE INDEX idx_wide_users_line ON wide_users(line_user_id);
CREATE INDEX idx_wide_keys_user ON wide_access_keys(line_user_id);

ALTER TABLE wide_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read users" ON wide_users
  FOR SELECT USING (true);
CREATE POLICY "Service role can insert users" ON wide_users
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update users" ON wide_users
  FOR UPDATE USING (true);
