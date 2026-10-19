-- Run ONCE in the existing familyguard-survey-db D1 Console.
-- This does not delete or alter any existing survey response.
CREATE TABLE IF NOT EXISTS survey_export_state (
  id TEXT PRIMARY KEY CHECK (id = 'main'),
  last_exported_count INTEGER NOT NULL DEFAULT 0,
  ready_count INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO survey_export_state (id, last_exported_count, ready_count)
SELECT 'main', COUNT(*), COUNT(*) FROM survey_responses;
