-- src/main/resources/db/migration/V016__add_user_email_to_claim.sql
ALTER TABLE claim ADD COLUMN IF NOT EXISTS user_email varchar(320);
