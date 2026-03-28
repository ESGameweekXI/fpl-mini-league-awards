-- FPL Mini-League Awards — Supabase schema
-- Run this in the Supabase SQL editor to initialise the database.

-- ── Reference data ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS teams (
  id           INT PRIMARY KEY,
  name         TEXT NOT NULL,
  short_name   TEXT NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gameweeks (
  id             INT PRIMARY KEY,
  name           TEXT NOT NULL,
  deadline_time  TIMESTAMPTZ,
  finished       BOOLEAN NOT NULL DEFAULT FALSE,
  is_current     BOOLEAN NOT NULL DEFAULT FALSE,
  is_next        BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS players (
  id             INT PRIMARY KEY,
  web_name       TEXT NOT NULL,
  first_name     TEXT NOT NULL,
  second_name    TEXT NOT NULL,
  element_type   SMALLINT NOT NULL,  -- 1=GK 2=DEF 3=MID 4=FWD
  team_id        INT REFERENCES teams (id) ON DELETE SET NULL,
  now_cost       INT NOT NULL,       -- tenths of £1m
  total_points   INT NOT NULL DEFAULT 0,
  status         TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS players_team_id_idx ON players (team_id);

-- ── Manager / league data ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS managers (
  id              INT PRIMARY KEY,
  entry_name      TEXT NOT NULL,
  player_name     TEXT NOT NULL,
  started_event   INT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leagues (
  id                INT PRIMARY KEY,
  name              TEXT NOT NULL,
  created_by_entry  INT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS league_managers (
  league_id     INT NOT NULL REFERENCES leagues  (id) ON DELETE CASCADE,
  manager_id    INT NOT NULL REFERENCES managers (id) ON DELETE CASCADE,
  rank          INT,
  total_points  INT NOT NULL DEFAULT 0,
  PRIMARY KEY (league_id, manager_id)
);

CREATE INDEX IF NOT EXISTS league_managers_manager_id_idx ON league_managers (manager_id);
CREATE INDEX IF NOT EXISTS league_managers_league_id_idx  ON league_managers (league_id);

-- ── Per-manager event data ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS manager_history (
  manager_id    INT NOT NULL REFERENCES managers (id) ON DELETE CASCADE,
  event         INT NOT NULL,   -- gameweek number
  points        INT NOT NULL DEFAULT 0,
  total_points  INT NOT NULL DEFAULT 0,
  rank          INT,
  overall_rank  INT,
  PRIMARY KEY (manager_id, event)
);

CREATE INDEX IF NOT EXISTS manager_history_event_idx      ON manager_history (event);
CREATE INDEX IF NOT EXISTS manager_history_manager_id_idx ON manager_history (manager_id);

CREATE TABLE IF NOT EXISTS manager_picks (
  manager_id       INT  NOT NULL REFERENCES managers (id) ON DELETE CASCADE,
  event            INT  NOT NULL,
  element          INT  NOT NULL,  -- player id
  position         SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 15),
  multiplier       SMALLINT NOT NULL DEFAULT 1,
  is_captain       BOOLEAN NOT NULL DEFAULT FALSE,
  is_vice_captain  BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (manager_id, event, element)
);

CREATE INDEX IF NOT EXISTS manager_picks_event_idx      ON manager_picks (event);
CREATE INDEX IF NOT EXISTS manager_picks_manager_id_idx ON manager_picks (manager_id);
CREATE INDEX IF NOT EXISTS manager_picks_element_idx    ON manager_picks (element);

CREATE TABLE IF NOT EXISTS manager_transfers (
  id                BIGSERIAL PRIMARY KEY,
  manager_id        INT NOT NULL REFERENCES managers (id) ON DELETE CASCADE,
  event             INT NOT NULL,
  element_in        INT NOT NULL,
  element_in_cost   INT NOT NULL,  -- tenths of £1m
  element_out       INT NOT NULL,
  element_out_cost  INT NOT NULL,  -- tenths of £1m
  time              TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS manager_transfers_manager_id_idx ON manager_transfers (manager_id);
CREATE INDEX IF NOT EXISTS manager_transfers_event_idx      ON manager_transfers (event);
