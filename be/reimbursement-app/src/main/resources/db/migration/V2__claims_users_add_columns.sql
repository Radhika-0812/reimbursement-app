/* ── Claims: new file fields, claim date, currency ─────────────────────────── */

-- If you no longer use receipt_url, drop it (optional — comment out if you still keep URL)
ALTER TABLE claims
  DROP COLUMN IF EXISTS receipt_url;

ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS receipt_file          BYTEA,              -- binary receipt
  ADD COLUMN IF NOT EXISTS receipt_filename      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS receipt_content_type  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS receipt_size          BIGINT CHECK (receipt_size IS NULL OR receipt_size >= 0),
  ADD COLUMN IF NOT EXISTS claim_date            DATE,
  ADD COLUMN IF NOT EXISTS currency_code         VARCHAR(3);

-- Backfill reasonable defaults for existing rows, then enforce NOT NULLs
UPDATE claims SET claim_date = CURRENT_DATE WHERE claim_date IS NULL;
UPDATE claims SET currency_code = 'INR'       WHERE currency_code IS NULL;

ALTER TABLE claims
  ALTER COLUMN claim_date SET NOT NULL,
  ALTER COLUMN currency_code SET NOT NULL;

-- Helpful index for your UI filters (status + date, keep existing idx as well)
CREATE INDEX IF NOT EXISTS idx_claims_status_claimdate ON claims(status, claim_date);

/* ── Users: add designation and currency_code ─────────────────────────────── */

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS designation   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3);

UPDATE users SET designation = COALESCE(designation, 'ASSOCIATE');
UPDATE users SET currency_code = COALESCE(currency_code, 'INR');

ALTER TABLE users
  ALTER COLUMN designation   SET NOT NULL,
  ALTER COLUMN currency_code SET NOT NULL;
