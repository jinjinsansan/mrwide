-- ミスターワイド Supabaseテーブル作成SQL
-- Supabase Dashboard > SQL Editor で実行してください

-- 閲覧キー管理
CREATE TABLE wide_access_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_code VARCHAR(8) UNIQUE NOT NULL,
  venue VARCHAR(20) NOT NULL,
  race_date DATE NOT NULL,
  race_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  access_count INT DEFAULT 0
);

-- 指数データ（開催単位で保存）
CREATE TABLE wide_index_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue VARCHAR(20) NOT NULL,
  race_date DATE NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(venue, race_date)
);

-- インデックス
CREATE INDEX idx_wide_keys_code ON wide_access_keys(key_code);
CREATE INDEX idx_wide_keys_date ON wide_access_keys(race_date);
CREATE INDEX idx_wide_index_venue_date ON wide_index_data(venue, race_date);

-- RLS (Row Level Security) を有効化
ALTER TABLE wide_access_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE wide_index_data ENABLE ROW LEVEL SECURITY;

-- APIからの読み取りを許可するポリシー (service_roleのみ書き込み)
CREATE POLICY "Allow read access keys" ON wide_access_keys
  FOR SELECT USING (true);

CREATE POLICY "Allow read index data" ON wide_index_data
  FOR SELECT USING (true);

CREATE POLICY "Service role can insert keys" ON wide_access_keys
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can insert data" ON wide_index_data
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update keys" ON wide_access_keys
  FOR UPDATE USING (true);
