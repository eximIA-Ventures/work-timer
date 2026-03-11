-- Work Timer — Session tracking table
-- No auth required (single-user tool)

CREATE TABLE IF NOT EXISTS work_sessions (
  id TEXT PRIMARY KEY,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_ms BIGINT NOT NULL DEFAULT 0,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for date-range queries (stats)
CREATE INDEX idx_work_sessions_start ON work_sessions (start_time DESC);

-- Current session pointer (single row table)
CREATE TABLE IF NOT EXISTS timer_state (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  current_session TEXT REFERENCES work_sessions(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Initialize state
INSERT INTO timer_state (id, current_session) VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;

-- Allow anonymous access (no auth — personal tool behind network)
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE timer_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on work_sessions" ON work_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on timer_state" ON timer_state FOR ALL USING (true) WITH CHECK (true);
