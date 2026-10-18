-- Run this schema against your Cloudflare D1 database.
CREATE TABLE IF NOT EXISTS survey_responses (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  country TEXT NOT NULL,
  answers_json TEXT NOT NULL,
  consent INTEGER NOT NULL CHECK (consent = 1)
);
CREATE INDEX IF NOT EXISTS idx_survey_responses_created_at ON survey_responses(created_at);
CREATE INDEX IF NOT EXISTS idx_survey_responses_country ON survey_responses(country);

-- Each follow-up purpose is separate from survey answers and from the other purpose.
CREATE TABLE IF NOT EXISTS report_subscribers (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  consent INTEGER NOT NULL CHECK (consent = 1)
);
CREATE INDEX IF NOT EXISTS idx_report_subscribers_created_at ON report_subscribers(created_at);

CREATE TABLE IF NOT EXISTS tester_interest_contacts (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  consent INTEGER NOT NULL CHECK (consent = 1)
);
CREATE INDEX IF NOT EXISTS idx_tester_interest_created_at ON tester_interest_contacts(created_at);
