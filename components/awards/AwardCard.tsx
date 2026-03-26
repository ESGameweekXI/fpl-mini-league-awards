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
  cardRef?: React.Ref<HTMLDivElement>;
}

export default function AwardCard({
  award,
  leagueName,
  cardRef,
}: AwardCardProps) {
  const icon = AWARD_ICONS[award.id] ?? '🏆';

  const winnerNames =
    award.winners.length === 0
      ? 'No data'
      : award.winners
          .map((w) => `${w.name} (${w.teamName})`)
          .join('\n');

  return (
    <div className="award-card" ref={cardRef}>
      <div className="award-card__bg-accent" />

      {/* League name top-right */}
      <div className="award-card__league-name">{leagueName}</div>

      {/* Icon */}
      <div className="award-card__icon">{icon}</div>

      {/* Award name */}
      <div className="award-card__name">{award.name}</div>

      {/* Winner(s) */}
      <div className="award-card__winners" style={{ whiteSpace: 'pre-line' }}>
        {winnerNames}
      </div>

      {/* Stat */}
      <div className="award-card__stat">{award.stat}</div>

      {/* Description */}
      <div className="award-card__description">{award.description}</div>

      {award.fallback && (
        <div className="award-card__fallback-badge">
          ⚠ Partial data — some gameweeks missing
        </div>
      )}

      {/* Branding footer */}
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
