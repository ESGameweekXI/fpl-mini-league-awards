'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import AwardCard from './AwardCard';
import ShareButton from './ShareButton';
import { AwardResult } from '@/lib/fpl/types';
import '@/styles/awards.css';

interface AwardCarouselProps {
  awards: AwardResult[];
  leagueName: string;
}

export default function AwardCarousel({
  awards,
  leagueName,
}: AwardCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [scale, setScale] = useState(1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>(
    Array(awards.length).fill(null)
  );

  // Compute scale so the 1080px card fits the viewport
  useEffect(() => {
    function updateScale() {
      if (!viewportRef.current) return;
      const { width } = viewportRef.current.getBoundingClientRect();
      setScale(width / 1080);
    }
    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (viewportRef.current) ro.observe(viewportRef.current);
    return () => ro.disconnect();
  }, []);

  const prev = useCallback(
    () => setCurrent((c) => Math.max(0, c - 1)),
    []
  );
  const next = useCallback(
    () => setCurrent((c) => Math.min(awards.length - 1, c + 1)),
  []
  );

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next]);

  const award = awards[current];
  const cardRef = { current: cardRefs.current[current] };

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* Viewport */}
      <div
        ref={viewportRef}
        className="award-carousel-viewport w-full"
        style={{ maxWidth: 500 }}
      >
        <div
          className="award-card-scaler"
          style={{ transform: `scale(${scale})` }}
        >
          {awards.map((a, i) => (
            <div
              key={a.id}
              style={{ display: i === current ? 'block' : 'none' }}
            >
              <AwardCard
                award={a}
                leagueName={leagueName}
                cardRef={(el) => {
                  cardRefs.current[i] = el;
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-4">
        <button
          onClick={prev}
          disabled={current === 0}
          aria-label="Previous award"
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all"
          style={{
            background:
              current === 0
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(255,255,255,0.12)',
            color: current === 0 ? 'rgba(255,255,255,0.2)' : '#fff',
            border: 'none',
            cursor: current === 0 ? 'default' : 'pointer',
          }}
        >
          ‹
        </button>

        {/* Dots */}
        <div className="carousel-dots">
          {awards.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Go to award ${i + 1}`}
              className={`carousel-dot${i === current ? ' carousel-dot--active' : ''}`}
            />
          ))}
        </div>

        <button
          onClick={next}
          disabled={current === awards.length - 1}
          aria-label="Next award"
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all"
          style={{
            background:
              current === awards.length - 1
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(255,255,255,0.12)',
            color:
              current === awards.length - 1
                ? 'rgba(255,255,255,0.2)'
                : '#fff',
            border: 'none',
            cursor:
              current === awards.length - 1 ? 'default' : 'pointer',
          }}
        >
          ›
        </button>
      </div>

      {/* Counter + share */}
      <div className="flex items-center gap-4">
        <span
          style={{
            color: 'var(--brand-text-muted)',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
          }}
        >
          {current + 1} / {awards.length}
        </span>
        <ShareButton
          cardRef={cardRef}
          awardId={award.id}
          leagueName={leagueName}
        />
      </div>
    </div>
  );
}
