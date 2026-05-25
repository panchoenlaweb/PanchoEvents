-- ═══════════════════════════════════════════════════════════════════════════
-- PanchoEvents Auth System – Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active     BOOLEAN      NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_login    TIMESTAMPTZ
);

-- ── Events ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  event_date    TIMESTAMPTZ,
  thumbnail_url TEXT,
  stream_url    TEXT,
  status        VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  slug          VARCHAR(100) UNIQUE NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── User–Event assignments (many-to-many) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_events (
  user_id     UUID REFERENCES users(id)  ON DELETE CASCADE,
  event_id    UUID REFERENCES events(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, event_id)
);

-- ── Sessions (single-session enforcement) ────────────────────────────────────
-- Each login inserts one row here and deletes all previous rows for that user.
-- Every authenticated request validates that session_token still exists in DB.
CREATE TABLE IF NOT EXISTS sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ  NOT NULL,
  ip_address    VARCHAR(45),
  user_agent    TEXT
);

-- ── Access logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS access_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  username   VARCHAR(50),
  event_type VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token      ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires    ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_events_user    ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_event   ON user_events(event_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user    ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_created ON access_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_access_logs_type    ON access_logs(event_type);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- All DB access goes through API routes using the service role key,
-- so RLS is enabled for safety but all operations use the service role bypass.
ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs  ENABLE ROW LEVEL SECURITY;

-- ── Migration: refresh tokens + heartbeat (run if upgrading existing schema) ──
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS refresh_token  TEXT UNIQUE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_ping      TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_sessions_refresh ON sessions(refresh_token);

-- ── Auto-cleanup expired sessions (optional cron via pg_cron) ────────────────
-- DELETE FROM sessions WHERE expires_at < NOW();
