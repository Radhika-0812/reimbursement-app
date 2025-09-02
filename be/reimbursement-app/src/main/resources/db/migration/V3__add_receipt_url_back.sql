-- Bring back the column Hibernate still expects
ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS receipt_url TEXT;
