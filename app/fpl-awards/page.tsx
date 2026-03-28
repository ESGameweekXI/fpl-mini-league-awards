'use client';

import { useState, useCallback } from 'react';
import { fetchFPL, batchFetch } from '@/lib/fpl/fetcher';
import { clearBootstrapCache } from '@/lib/fpl/bootstrap';
import { computeAwardsFromManagerData } from '@/lib/awards';
import { getLeagueManagers } from '@/lib/supabase/queries';
import {
  EntryData,
  ClassicLeague,
  LeagueStandings,
  Bootstrap,
  GWLive,
  AwardResult,
} from '@/lib/fpl/types';
import AwardCarousel from '@/components/awards/AwardCarousel';
import '@/styles/awards.css';

type Stage =
  | { type: 'input' }
  | { type: 'loading-entry' }
  | { type: 'league-select'; entry: EntryData; filteredLeagues: ClassicLeague[] }
  | {
      type: 'loading-awards';
      leagueId: number;
      leagueName: string;
      progress: number;
      status: string;
    }
  | { type: 'awards'; results: AwardResult[]; leagueName: string }
  | { type: 'error'; message: string };

export default function FplAwardsPage() {
  const [teamId, setTeamId] = useState('');
  const [stage, setStage] = useState<Stage>({ type: 'input' });

  const handleTeamIdSubmit = useCallback(async () => {
    const id = parseInt(teamId.trim(), 10);
    if (!id || id <= 0) {
      setStage({ type: 'error', message: 'Please enter a valid FPL Team ID.' });
      return;
    }

    setStage({ type: 'loading-entry' });
    clearBootstrapCache();

    try {
      const entry = await fetchFPL<EntryData>(`entry/${id}/`);
      if (!entry?.leagues?.classic?.length) {
        setStage({ type: 'error', message: 'No classic leagues found for this team ID.' });
        return;
      }

      // Fetch standings for every classic league to check size
      const classicLeagues = entry.leagues.classic;
      const standingsResults = await Promise.allSettled(
        classicLeagues.map((l) =>
          fetchFPL<LeagueStandings>(`leagues-classic/${l.id}/standings/`)
        )
      );

      const filteredLeagues = classicLeagues.filter((_, i) => {
        const result = standingsResults[i];
        if (result.status === 'rejected') return false;
        const { standings } = result.value;
        const count = standings.count ?? standings.results.length;
        return count <= 100;
      });

      if (filteredLeagues.length === 0) {
        setStage({
          type: 'error',
          message: 'No classic leagues with 100 or fewer managers found for this team.',
        });
        return;
      }

      setStage({ type: 'league-select', entry, filteredLeagues });
    } catch {
      setStage({
        type: 'error',
        message: 'Could not fetch your FPL data. Check your Team ID and try again.',
      });
    }
  }, [teamId]);

  const handleLeagueSelect = useCallback(
    async (leagueId: number, leagueName: string, _teamId: number) => {
      const tick = (progress: number, status: string) =>
        setStage((prev) =>
          prev.type === 'loading-awards' ? { ...prev, progress, status } : prev
        );

      setStage({
        type: 'loading-awards',
        leagueId,
        leagueName,
        progress: 0,
        status: 'Checking cache…',
      });

      try {
        // 1. Check whether cached data is fresh
        const statusRes = await fetch(
          `/api/league-status?leagueId=${leagueId}`
        );
        if (!statusRes.ok) throw new Error('Could not check league cache.');
        const { stale } = (await statusRes.json()) as { stale: boolean };

        // 2. If stale, stream a sync from FPL → Supabase (0 → 80%)
        if (stale) {
          tick(0.01, 'Syncing league data…');

          const syncRes = await fetch('/api/sync-league', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leagueId }),
          });
          if (!syncRes.ok || !syncRes.body) {
            throw new Error('Sync request failed.');
          }

          const reader = syncRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          outer: while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let nl: number;
            while ((nl = buffer.indexOf('\n')) !== -1) {
              const line = buffer.slice(0, nl).trim();
              buffer = buffer.slice(nl + 1);
              if (!line) continue;

              const chunk = JSON.parse(line) as {
                pct?: number;
                message?: string;
                error?: string;
              };

              if (chunk.error) throw new Error(chunk.error);
              if (chunk.pct !== undefined && chunk.message) {
                tick((chunk.pct / 100) * 0.8, chunk.message);
              }
              if (chunk.pct === 100) break outer;
            }
          }
        }

        // 3. Load manager data from Supabase (80 → 85%)
        tick(0.82, 'Loading league data…');
        const managers = await getLeagueManagers(leagueId);
        if (managers.length === 0) {
          throw new Error('No manager data found. Try syncing again.');
        }

        // 4. Fetch bootstrap + GW live scores (85 → 96%)
        tick(0.86, 'Fetching gameweek data…');
        const bootstrap = await fetchFPL<Bootstrap>('bootstrap-static/');
        const finishedGws = bootstrap.events
          .filter((e) => e.finished)
          .map((e) => e.id);

        const gwLivePaths = finishedGws.map((gw) => `event/${gw}/live/`);
        const gwLiveResults = await batchFetch<GWLive>(
          gwLivePaths,
          10,
          (p) => tick(0.86 + p * 0.1, 'Fetching live scores…')
        );

        const gwLiveMap: Record<number, GWLive | null> = {};
        finishedGws.forEach((gw, i) => {
          gwLiveMap[gw] = gwLiveResults[i];
        });

        // 5. Compute awards (96 → 100%)
        tick(0.97, 'Calculating awards…');
        const results = computeAwardsFromManagerData(
          managers,
          bootstrap,
          gwLiveMap,
          finishedGws
        );

        setStage({ type: 'awards', results, leagueName });
      } catch (err) {
        setStage({
          type: 'error',
          message:
            err instanceof Error ? err.message : 'Failed to compute awards.',
        });
      }
    },
    []
  );

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'var(--brand-bg)', color: 'var(--brand-text)' }}
    >
      {stage.type === 'input' && (
        <InputScreen
          teamId={teamId}
          setTeamId={setTeamId}
          onSubmit={handleTeamIdSubmit}
        />
      )}

      {stage.type === 'loading-entry' && (
        <LoadingScreen message="Looking up your leagues…" />
      )}

      {stage.type === 'league-select' && (
        <LeagueSelectScreen
          entry={stage.entry}
          filteredLeagues={stage.filteredLeagues}
          onSelect={(id, name) =>
            handleLeagueSelect(id, name, stage.entry.id)
          }
          onBack={() => setStage({ type: 'input' })}
        />
      )}

      {stage.type === 'loading-awards' && (
        <LoadingAwardsScreen
          progress={stage.progress}
          status={stage.status}
          leagueName={stage.leagueName}
        />
      )}

      {stage.type === 'awards' && (
        <AwardsScreen
          results={stage.results}
          leagueName={stage.leagueName}
          onReset={() => {
            clearBootstrapCache();
            setStage({ type: 'input' });
            setTeamId('');
          }}
        />
      )}

      {stage.type === 'error' && (
        <ErrorScreen
          message={stage.message}
          onRetry={() => setStage({ type: 'input' })}
        />
      )}
    </main>
  );
}

// ── Sub-screens ──────────────────────────────────────────────────

function InputScreen({
  teamId,
  setTeamId,
  onSubmit,
}: {
  teamId: string;
  setTeamId: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-sm">
      <div className="text-center">
        <h1
          className="text-4xl font-extrabold mb-2"
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--brand-secondary)',
          }}
        >
          FPL Mini-League Awards
        </h1>
        <p style={{ color: 'var(--brand-text-muted)', fontFamily: 'var(--font-body)' }}>
          Drop in your team ID, choose your mini-league and let the awards ceremony begin
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full">
        <label
          htmlFor="teamId"
          className="text-sm font-medium"
          style={{ color: 'var(--brand-text-muted)', fontFamily: 'var(--font-body)' }}
        >
          Your FPL Team ID
        </label>
        <input
          id="teamId"
          type="number"
          min="1"
          placeholder="e.g. 1234567"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          className="w-full rounded-lg px-4 py-3 text-lg outline-none"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(0,255,194,0.3)',
            color: 'var(--brand-text)',
            fontFamily: 'var(--font-body)',
          }}
        />
        <p
          className="text-xs"
          style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-body)' }}
        >
          Find it in the URL when you visit the FPL website: fantasy.premierleague.com/entry/
          <strong>XXXXXXX</strong>
        </p>
      </div>

      <button
        onClick={onSubmit}
        disabled={!teamId.trim()}
        className="w-full py-3 rounded-xl font-semibold text-lg transition-all"
        style={{
          background: teamId.trim()
            ? 'var(--brand-secondary)'
            : 'rgba(0,255,194,0.2)',
          color: 'var(--brand-primary)',
          fontFamily: 'var(--font-heading)',
          border: 'none',
          cursor: teamId.trim() ? 'pointer' : 'default',
        }}
      >
        Find My Leagues →
      </button>
    </div>
  );
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <Spinner />
      <p style={{ color: 'var(--brand-text-muted)', fontFamily: 'var(--font-body)' }}>
        {message}
      </p>
    </div>
  );
}

function LeagueSelectScreen({
  entry,
  filteredLeagues,
  onSelect,
  onBack,
}: {
  entry: EntryData;
  filteredLeagues: ClassicLeague[];
  onSelect: (id: number, name: string) => void;
  onBack: () => void;
}) {
  const leagues = filteredLeagues;

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md">
      <div className="text-center">
        <h2
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-secondary)' }}
        >
          {entry.player_first_name}&apos;s Leagues
        </h2>
        <p
          className="text-sm mt-1"
          style={{ color: 'var(--brand-text-muted)', fontFamily: 'var(--font-body)' }}
        >
          Select a mini-league to generate awards
        </p>
      </div>

      <div className="flex flex-col gap-2 w-full">
        {leagues.map((league) => (
          <button
            key={league.id}
            onClick={() => onSelect(league.id, league.name)}
            className="w-full text-left px-5 py-4 rounded-xl transition-all"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(0,255,194,0.15)',
              color: 'var(--brand-text)',
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                'rgba(0,255,194,0.08)';
              (e.currentTarget as HTMLElement).style.borderColor =
                'rgba(0,255,194,0.4)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                'rgba(255,255,255,0.05)';
              (e.currentTarget as HTMLElement).style.borderColor =
                'rgba(0,255,194,0.15)';
            }}
          >
            <div className="font-medium">{league.name}</div>
            <div
              className="text-xs mt-0.5"
              style={{ color: 'var(--brand-text-muted)' }}
            >
              Rank #{league.entry_rank ?? '—'}
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onBack}
        className="text-sm"
        style={{
          color: 'rgba(255,255,255,0.4)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
        }}
      >
        ← Change Team ID
      </button>
    </div>
  );
}

function LoadingAwardsScreen({
  progress,
  status,
  leagueName,
}: {
  progress: number;
  status: string;
  leagueName: string;
}) {
  const pct = Math.round(progress * 100);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm">
      <div className="text-center">
        <h2
          className="text-xl font-bold mb-1"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-secondary)' }}
        >
          {leagueName}
        </h2>
        <p
          className="text-sm"
          style={{ color: 'var(--brand-text-muted)', fontFamily: 'var(--font-body)' }}
        >
          Crunching the numbers…
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full">
        <div
          className="w-full rounded-full overflow-hidden"
          style={{
            height: 8,
            background: 'rgba(255,255,255,0.08)',
          }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${pct}%`,
              background: 'var(--brand-secondary)',
            }}
          />
        </div>
        <div
          className="flex justify-between mt-2 text-xs"
          style={{ color: 'var(--brand-text-muted)', fontFamily: 'var(--font-body)' }}
        >
          <span>{status}</span>
          <span>{pct}%</span>
        </div>
      </div>

      <Spinner />
    </div>
  );
}

function AwardsScreen({
  results,
  leagueName,
  onReset,
}: {
  results: AwardResult[];
  leagueName: string;
  onReset: () => void;
}) {
  return (
    <AwardCarousel awards={results} leagueName={leagueName} onReset={onReset} />
  );
}

function ErrorScreen({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 max-w-sm text-center">
      <div className="text-5xl">⚠️</div>
      <div>
        <h2
          className="text-xl font-bold mb-2"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--brand-secondary)' }}
        >
          Something went wrong
        </h2>
        <p style={{ color: 'var(--brand-text-muted)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
          {message}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="px-6 py-3 rounded-xl font-semibold"
        style={{
          background: 'var(--brand-secondary)',
          color: 'var(--brand-primary)',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-heading)',
        }}
      >
        Try Again
      </button>
    </div>
  );
}

function Spinner() {
  return (
    <div
      className="w-8 h-8 rounded-full border-2 animate-spin"
      style={{
        borderColor: 'rgba(0,255,194,0.2)',
        borderTopColor: 'var(--brand-secondary)',
      }}
    />
  );
}
