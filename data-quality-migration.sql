-- FamilyGuard data quality review. Safe additive migration: does not alter or delete existing records.
CREATE TABLE IF NOT EXISTS data_quality_reviews (
  record_type TEXT NOT NULL CHECK(record_type IN ('response','report','tester')),
  record_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('valid','review','excluded')),
  reason TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  PRIMARY KEY(record_type, record_id)
);
CREATE INDEX IF NOT EXISTS idx_quality_status ON data_quality_reviews(status, record_type);
CREATE TABLE IF NOT EXISTS data_quality_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_type TEXT NOT NULL,
  record_id TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  changed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_quality_audit_record ON data_quality_audit(record_type, record_id, changed_at);
