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
  const ctaShareCardRef = useRef<HTMLDivElement | null>(null);
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
          <CTASlide cardRef={ctaShareCardRef} />
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
              background: 'transparent',
              border: '1.5px solid var(--brand-secondary)',
              color: 'var(--brand-secondary)',
              fontFamily: 'var(--font-heading)',
              fontSize: 16,
              fontWeight: 700,
              textAlign: 'center',
              textDecoration: 'none',
              boxSizing: 'border-box',
            }}
          >
            Find out more about Gameweek XI
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

      {/* ── Hidden off-screen cards for html2canvas ── */}
      <div
        style={{
          position: 'absolute',
          left: -9999,
          top: -9999,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        {/* Award export cards */}
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

        {/* CTA share card */}
        <div
          ref={ctaShareCardRef}
          className="award-card"
          style={{
            background: '#021A16',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 40,
            padding: '80px 100px',
            textAlign: 'center',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/gameweek-logo.png"
            alt="Gameweek XI"
            width={120}
            height={120}
            style={{ objectFit: 'contain' }}
          />
          <div>
            <div
              style={{
                fontFamily: 'Sora, sans-serif',
                fontSize: 80,
                fontWeight: 800,
                color: '#00FFC2',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                marginBottom: 24,
              }}
            >
              FPL Mini League Awards
            </div>
            <div
              style={{
                fontFamily: 'Roboto, sans-serif',
                fontSize: 40,
                color: '#85FFE2',
                lineHeight: 1.4,
              }}
            >
              See how your mini-league stacks up
            </div>
          </div>
          <div
            style={{
              fontFamily: 'Roboto, sans-serif',
              fontSize: 28,
              color: 'rgba(133,255,226,0.5)',
              marginTop: 20,
            }}
          >
            fpl-mini-league-awards.vercel.app
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CTASlide ──────────────────────────────────────────────────────

function CTASlide({ cardRef }: { cardRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'clamp(12px, 3vh, 24px)',
        textAlign: 'center',
        padding: '0 8px',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/gameweek-logo.png"
        alt="Gameweek XI"
        width={60}
        height={60}
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
          fontSize: 'clamp(16px, 4.5vw, 28px)',
          color: 'var(--brand-text-muted)',
          lineHeight: 1.4,
        }}
      >
        Share with your friends
      </div>
      <CTAShareButton cardRef={cardRef} />
      <div
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(12px, 3.2vw, 18px)',
          color: 'var(--brand-text-muted)',
          lineHeight: 1.5,
          maxWidth: '72vw',
          opacity: 0.65,
        }}
      >
        Share &amp; follow @GameweekXI on X for a chance to win a football shirt of your choice
      </div>
    </div>
  );
}

// ── CTAShareButton ────────────────────────────────────────────────

type ShareLabel = 'idle' | 'loading' | 'copied';

const CTA_URL = 'https://fpl-mini-league-awards.vercel.app';

function CTAShareButton({
  cardRef,
}: {
  cardRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [label, setLabel] = useState<ShareLabel>('idle');

  const handleShare = useCallback(async () => {
    if (label === 'loading') return;
    setLabel('loading');

    const copyAndFeedback = async () => {
      try {
        await navigator.clipboard.writeText(CTA_URL);
        setLabel('copied');
        setTimeout(() => setLabel('idle'), 2000);
      } catch {
        setLabel('idle');
      }
    };

    try {
      let file: File | undefined;

      if (cardRef.current) {
        await document.fonts.ready;
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(cardRef.current, {
          width: 1080,
          height: 1080,
          useCORS: true,
          background: '#021a16',
        });
        const blob = await new Promise<Blob | null>((res) =>
          canvas.toBlob(res, 'image/png')
        );
        if (blob) {
          file = new File([blob], 'fpl-awards.png', { type: 'image/png' });
        }
      }

      const shareData: ShareData = {
        text: 'Ready for the FPL Mini League Awards? 🏆',
        url: CTA_URL,
        ...(file && navigator.canShare?.({ files: [file] }) ? { files: [file] } : {}),
      };

      if (navigator.share) {
        await navigator.share(shareData);
        setLabel('idle');
      } else {
        await copyAndFeedback();
      }
    } catch (err) {
      // User cancelled share — don't fall through to clipboard
      if (err instanceof Error && err.name === 'AbortError') {
        setLabel('idle');
        return;
      }
      await copyAndFeedback();
    }
  }, [label, cardRef]);

  const buttonLabel =
    label === 'loading' ? 'Preparing…' :
    label === 'copied'  ? 'Link copied!' :
    '↗ Share the Awards';

  return (
    <button
      onClick={handleShare}
      disabled={label === 'loading'}
      style={{
        width: '100%',
        padding: '14px 24px',
        borderRadius: 12,
        background: label === 'copied' ? 'rgba(0,255,194,0.7)' : 'var(--brand-secondary)',
        color: 'var(--brand-primary)',
        fontFamily: 'var(--font-heading)',
        fontSize: 16,
        fontWeight: 700,
        border: 'none',
        cursor: label === 'loading' ? 'default' : 'pointer',
        transition: 'background 0.2s, opacity 0.2s',
        opacity: label === 'loading' ? 0.7 : 1,
      }}
    >
      {buttonLabel}
    </button>
  );
}
