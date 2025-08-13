-- V1__init.sql

-- USERS
CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  name          VARCHAR(30) NOT NULL,
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role          VARCHAR(30) NOT NULL,             -- ROLE_USER | ROLE_ADMIN
  department    VARCHAR(30) NOT NULL,
  address       VARCHAR(100) NOT NULL,
  contact       VARCHAR(10) NOT NULL,
  pincode       VARCHAR(6) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_users_name UNIQUE (name)          -- required to reference by name
);

-- CLAIMS
CREATE TABLE claims (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES users(id),
  user_name        VARCHAR(30) NOT NULL,          -- must match users.name
  title            VARCHAR(140) NOT NULL,
  amount_cents     BIGINT NOT NULL CHECK (amount_cents > 0),
  claim_type       VARCHAR(40) NOT NULL,          -- PETROL_ALLOWANCE | CAB_ALLOWANCE | MEAL | OFFICE_SUPPLY | POSTAGE
  description      TEXT,
  receipt_url      TEXT,
  status           VARCHAR(20) NOT NULL DEFAULT 'PENDING',   -- PENDING | APPROVED | REJECTED
  admin_comment    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_claims_user_name
    FOREIGN KEY (user_name) REFERENCES users(name) ON UPDATE CASCADE  -- hard FK to users.name
);

CREATE INDEX idx_claims_user_status_created
  ON claims(user_id, status, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Helpers so app only sets user_id; DB fills/keeps user_name consistent
-- ─────────────────────────────────────────────────────────────────────────────

-- Set claims.user_name from users.name on insert/update of claims.user_id
CREATE OR REPLACE FUNCTION set_claim_user_name()
RETURNS trigger AS $$
BEGIN
  SELECT u.name INTO NEW.user_name FROM users u WHERE u.id = NEW.user_id;
  IF NEW.user_name IS NULL THEN
    RAISE EXCEPTION 'user_id % does not exist', NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_claims_set_user_name
BEFORE INSERT OR UPDATE OF user_id
ON claims
FOR EACH ROW
EXECUTE FUNCTION set_claim_user_name();

-- If a user's name changes, cascade will update claims.user_name via FK.
-- (No extra trigger needed; ON UPDATE CASCADE handles it.)
