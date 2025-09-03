-- src/main/resources/db/migration/V014__recall_fields.sql
ALTER TABLE claims
    ADD COLUMN IF NOT EXISTS recall_active boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS recall_reason varchar(2000),
    ADD COLUMN IF NOT EXISTS resubmit_comment varchar(2000);

CREATE TABLE IF NOT EXISTS claim_attachments (
    id BIGSERIAL PRIMARY KEY,
    claim_id BIGINT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    storage_path VARCHAR(1024) NOT NULL,
    original_filename VARCHAR(512) NOT NULL,
    content_type VARCHAR(255),
    size_bytes BIGINT NOT NULL DEFAULT 0,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    kind VARCHAR(64)
);
