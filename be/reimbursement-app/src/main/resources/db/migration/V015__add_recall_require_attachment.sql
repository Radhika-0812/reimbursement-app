-- add the column if it doesn't exist yet
ALTER TABLE public.claims
    ADD COLUMN IF NOT EXISTS recall_require_attachment boolean NOT NULL DEFAULT false;
