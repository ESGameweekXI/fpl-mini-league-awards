export interface BootstrapPlayer {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  element_type: number; // 1=GK, 2=DEF, 3=MID, 4=FWD
  now_cost: number; // tenths of a million
  total_points: number;
  team: number;
  status: string;
}

export interface BootstrapEvent {
  id: number;
  name: string;
  finished: boolean;
  is_current: boolean;
  is_next: boolean;
  deadline_time: string;
}

export interface BootstrapTeam {
  id: number;
  name: string;
  short_name: string;
}

export interface Bootstrap {
  elements: BootstrapPlayer[];
  events: BootstrapEvent[];
  teams: BootstrapTeam[];
}

export interface Manager {
  id: number;
  name: string; // player real name
  teamName: string;
}

export interface ClassicLeague {
  id: number;
  name: string;
  entry_rank: number;
  admin_entry: number | null;
}

export interface EntryData {
  id: number;
  player_first_name: string;
  player_last_name: string;
  name: string; // FPL team name
  leagues: {
    classic: ClassicLeague[];
    h2h: ClassicLeague[];
  };
}

export interface LeagueStanding {
  entry: number;
  entry_name: string;
  player_name: string;
  rank: number;
  last_rank: number;
  total: number;
}

export interface LeagueStandings {
  league: { id: number; name: string };
  standings: {
    results: LeagueStanding[];
    has_next: boolean;
    count?: number;
  };
}

export interface GWHistory {
  event: number;
  points: number;
  total_points: number;
  rank: number;
  event_transfers: number;
  event_transfers_cost: number;
  value: number;
}

export interface ManagerHistory {
  current: GWHistory[];
  past: Array<{ season_name: string; total_points: number; rank: number }>;
  chips: Array<{ event: number; name: string; time: string }>;
}

export interface Pick {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
}

export interface GWPicks {
  active_chip: string | null;
  entry_history: {
    event: number;
    points: number;
    total_points: number;
    event_transfers: number;
    event_transfers_cost: number;
    value: number;
  };
  picks: Pick[];
}

export interface Transfer {
  element_in: number;
  element_out: number;
  element_in_cost: number; // tenths of a million
  element_out_cost: number;
  event: number;
  time: string;
}

export interface LivePlayerStats {
  id: number;
  stats: {
    total_points: number;
    minutes: number;
    goals_scored: number;
    assists: number;
    clean_sheets: number;
    goals_conceded: number;
    yellow_cards: number;
    red_cards: number;
    saves: number;
    bonus: number;
    bps: number;
  };
  explain: Array<{
    fixture: number;
    stats: Array<{ identifier: string; points: number; value: number }>;
  }>;
}

export interface GWLive {
  elements: LivePlayerStats[];
}

export interface AwardResult {
  id: string;
  name: string;
  description: string;
  winners: Manager[];
  stat: string;
  fallback: boolean;
}

export interface ManagerData {
  manager: Manager;
  history: ManagerHistory | null;
  picks: Record<number, GWPicks | null>; // gw -> picks
  transfers: Transfer[] | null;
  startedEvent: number;
}

export interface AllData {
  bootstrap: Bootstrap;
  managers: ManagerData[];
  gwLive: Record<number, GWLive | null>;
  finishedGws: number[];
}
