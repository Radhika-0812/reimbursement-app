CREATE TABLE users (
  id           BIGSERIAL PRIMARY KEY,
  email        VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role         VARCHAR(30) NOT NULL,             -- ROLE_USER | ROLE_ADMIN
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE claims (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES users(id),
  title            VARCHAR(140) NOT NULL,
  amount_cents     BIGINT NOT NULL CHECK (amount_cents > 0),
  claim_type       VARCHAR(40) NOT NULL,         -- PETROL_ALLOWANCE | CAB_ALLOWANCE | MEAL | OFFICE_SUPPLY | POSTAGE
  description      TEXT,
  receipt_url      TEXT,
  status           VARCHAR(20) NOT NULL DEFAULT 'PENDING',   -- PENDING | APPROVED | REJECTED
  admin_comment    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_claims_user_status_created
  ON claims(user_id, status, created_at DESC);
