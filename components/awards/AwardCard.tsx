'use client';

import React from 'react';
import { AwardResult } from '@/lib/fpl/types';

const AWARD_ICONS: Record<string, string> = {
  'bench-warmer': '🪑',
  'revolving-door': '🔄',
  'wrong-armband': '💩',
  'captain-killer': '☠️',
  sheep: '🐑',
  sniper: '🎯',
  loyalist: '🤝',
  'money-pit': '💸',
};

interface AwardCardProps {
  award: AwardResult;
  leagueName: string;
  mode?: 'display' | 'export';
  cardRef?: React.Ref<HTMLDivElement>;
}

export default function AwardCard({
  award,
  leagueName,
  mode = 'display',
  cardRef,
}: AwardCardProps) {
  const icon = AWARD_ICONS[award.id] ?? '🏆';

  // ── Display mode — fluid, fills carousel container ──────────────
  if (mode === 'display') {
    const winnerNames =
      award.winners.length === 0
        ? 'No data'
        : award.winners
            .map((w) => `${w.name}\n${w.teamName}`)
            .join('\n\n');

    return (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'clamp(6px, 1.8vh, 18px)',
          textAlign: 'center',
          padding: '0 8px',
        }}
      >
        <div style={{ fontSize: 'clamp(44px, 13vw, 80px)', lineHeight: 1 }}>
          {icon}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(22px, 6.5vw, 52px)',
            fontWeight: 800,
            color: 'var(--brand-secondary)',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}
        >
          {award.name}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(15px, 4.5vw, 36px)',
            fontWeight: 700,
            color: 'var(--brand-text)',
            lineHeight: 1.3,
            whiteSpace: 'pre-line',
          }}
        >
          {winnerNames}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(14px, 4vw, 32px)',
            fontWeight: 600,
            color: 'var(--brand-secondary)',
            opacity: 0.9,
          }}
        >
          {award.stat}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(12px, 3.2vw, 24px)',
            color: 'var(--brand-text-muted)',
            lineHeight: 1.5,
            maxWidth: '80vw',
          }}
        >
          {award.description}
        </div>
        {award.fallback && (
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(10px, 2.5vw, 18px)',
              color: 'rgba(255,255,255,0.3)',
            }}
          >
            ⚠ Partial data
          </div>
        )}
      </div>
    );
  }

  // ── Export mode — fixed 1080×1080 for html2canvas ────────────────
  const winnerNamesExport =
    award.winners.length === 0
      ? 'No data'
      : award.winners.map((w) => `${w.name} (${w.teamName})`).join('\n');

  return (
    <div className="award-card" ref={cardRef}>
      <div className="award-card__bg-accent" />
      <div className="award-card__league-name">{leagueName}</div>
      <div className="award-card__icon">{icon}</div>
      <div className="award-card__name">{award.name}</div>
      <div className="award-card__winners" style={{ whiteSpace: 'pre-line' }}>
        {winnerNamesExport}
      </div>
      <div className="award-card__stat">{award.stat}</div>
      <div className="award-card__description">{award.description}</div>
      {award.fallback && (
        <div className="award-card__fallback-badge">
          ⚠ Partial data — some gameweeks missing
        </div>
      )}
      {/* Branding footer (export only) */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/gameweek-logo.png"
          alt="Gameweek XI"
          width={24}
          height={24}
          style={{ objectFit: 'contain' }}
        />
        <span
          style={{
            color: 'var(--brand-text-muted)',
            fontFamily: 'var(--font-body)',
            fontSize: 22,
            letterSpacing: '0.01em',
          }}
        >
          Powered by Gameweek XI
        </span>
      </div>
    </div>
  );
}
