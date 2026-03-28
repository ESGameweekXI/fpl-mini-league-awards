'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import AwardCard from './AwardCard';
import ShareButton from './ShareButton';
import { AwardResult } from '@/lib/fpl/types';
import '@/styles/awards.css';

interface AwardCarouselProps {
  awards: AwardResult[];
  leagueName: string;
  onReset?: () => void;
}

export default function AwardCarousel({
  awards,
  leagueName,
  onReset,
}: AwardCarouselProps) {
  const [current, setCurrent] = useState(0);
  const exportCardRefs = useRef<Array<HTMLDivElement | null>>(
    Array(awards.length).fill(null)
  );
  const touchStartX = useRef<number | null>(null);

  const totalSlides = awards.length + 1; // 8 awards + CTA
  const isCTA = current === awards.length;

  const prev = useCallback(
    () => setCurrent((c) => Math.max(0, c - 1)),
    []
  );
  const next = useCallback(
    () => setCurrent((c) => Math.min(totalSlides - 1, c + 1)),
    [totalSlides]
  );

  // Keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next]);

  const award = !isCTA ? awards[current] : undefined;
  const exportCardRef = { current: !isCTA ? exportCardRefs.current[current] : null };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        background: 'var(--brand-bg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── Top bar: league name + progress dots + close ── */}
      <div
        style={{
          padding: '20px 20px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          flexShrink: 0,
        }}
      >
        {/* League name row */}
        <div style={{ position: 'relative', textAlign: 'center' }}>
          <span
            style={{
              color: 'var(--brand-text-muted)',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
            }}
          >
            {leagueName}
          </span>
          {onReset && (
            <button
              onClick={onReset}
              aria-label="Start over"
              style={{
                position: 'absolute',
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.35)',
                cursor: 'pointer',
                fontSize: 18,
                lineHeight: 1,
                padding: 4,
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Progress dots */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            justifyContent: 'center',
            padding: '0 12px',
          }}
        >
          {Array.from({ length: totalSlides }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 3,
                flex: 1,
                maxWidth: 36,
                borderRadius: 2,
                background:
                  i < current
                    ? 'rgba(0,255,194,0.45)'
                    : i === current
                    ? 'var(--brand-secondary)'
                    : 'rgba(255,255,255,0.2)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Card content area (flex: 1, no scroll) ── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          padding: '0 24px',
        }}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const dx =
            e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(dx) > 40) {
            if (dx < 0) next();
            else prev();
          }
          touchStartX.current = null;
        }}
      >
        {/* Left tap zone */}
        <div
          onClick={current > 0 ? prev : undefined}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '33%',
            height: '100%',
            zIndex: 10,
            cursor: current > 0 ? 'pointer' : 'default',
          }}
        />
        {/* Right tap zone */}
        <div
          onClick={current < totalSlides - 1 ? next : undefined}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: '33%',
            height: '100%',
            zIndex: 10,
            cursor: current < totalSlides - 1 ? 'pointer' : 'default',
          }}
        />

        {isCTA ? (
          <CTASlide />
        ) : (
          <AwardCard award={award!} leagueName={leagueName} mode="display" />
        )}
      </div>

      {/* ── Bottom bar ── */}
      <div
        style={{
          flexShrink: 0,
          padding: '10px 24px 36px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          position: 'relative',
          zIndex: 20,
        }}
      >
        {isCTA ? (
          <a
            href="https://gameweekxi.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              width: '100%',
              padding: '14px 24px',
              borderRadius: 12,
              background: 'var(--brand-secondary)',
              color: 'var(--brand-primary)',
              fontFamily: 'var(--font-heading)',
              fontSize: 16,
              fontWeight: 700,
              textAlign: 'center',
              textDecoration: 'none',
            }}
          >
            Join Gameweek XI →
          </a>
        ) : (
          <>
            {/* Powered by Gameweek XI */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/gameweek-logo.png"
                alt="Gameweek XI"
                width={20}
                height={20}
                style={{ objectFit: 'contain' }}
              />
              <span
                style={{
                  color: 'var(--brand-text-muted)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                }}
              >
                Powered by Gameweek XI
              </span>
            </div>

            <ShareButton
              cardRef={exportCardRef}
              awardId={award!.id}
              leagueName={leagueName}
            />
          </>
        )}
      </div>

      {/* ── Hidden 1080×1080 export cards for html2canvas ── */}
      {/* (CTA slide has no export card) */}
      <div
        style={{
          position: 'absolute',
          left: -9999,
          top: -9999,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        {awards.map((a, i) => (
          <AwardCard
            key={a.id}
            award={a}
            leagueName={leagueName}
            mode="export"
            cardRef={(el) => {
              exportCardRefs.current[i] = el;
            }}
          />
        ))}
      </div>
    </div>
  );
}

function CTASlide() {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'clamp(14px, 3.5vh, 28px)',
        textAlign: 'center',
        padding: '0 8px',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/gameweek-logo.png"
        alt="Gameweek XI"
        width={80}
        height={80}
        style={{ objectFit: 'contain' }}
      />
      <div
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(28px, 8vw, 56px)',
          fontWeight: 800,
          color: 'var(--brand-secondary)',
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
        }}
      >
        That&apos;s a wrap!
      </div>
      <div
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(14px, 4vw, 26px)',
          color: 'var(--brand-text-muted)',
          lineHeight: 1.5,
          maxWidth: '75vw',
        }}
      >
        Awards are fun. Winning money is better.
      </div>
      <div
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(13px, 3.5vw, 22px)',
          color: 'var(--brand-text-muted)',
          lineHeight: 1.5,
          maxWidth: '75vw',
          opacity: 0.75,
        }}
      >
        Take your mini-league to Gameweek XI, play for cash every week.
      </div>
    </div>
  );
}
