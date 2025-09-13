-- src/main/resources/db/migration/V016__add_user_email_to_claim.sql
ALTER TABLE claims ADD COLUMN IF NOT EXISTS user_email varchar(320);
