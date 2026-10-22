-- Run this once in Cloudflare D1 Studio for familyguard-survey-db.
-- Stores only a salted hash of the Cloudflare-observed client IP, never the raw IP.
CREATE TABLE IF NOT EXISTS survey_ip_participation (
  ip_hash TEXT PRIMARY KEY,
  response_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('standard', 'freelancer-contest'))
);
CREATE INDEX IF NOT EXISTS idx_survey_ip_participation_created_at
  ON survey_ip_participation(created_at);
