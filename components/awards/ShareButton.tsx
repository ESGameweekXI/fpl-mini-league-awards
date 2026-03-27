'use client';

import { useCallback, useState } from 'react';

interface ShareButtonProps {
  cardRef: React.RefObject<HTMLDivElement | null>;
  awardId: string;
  leagueName: string;
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function ShareButton({
  cardRef,
  awardId,
  leagueName,
}: ShareButtonProps) {
  const [sharing, setSharing] = useState(false);

  const capture = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;

    await document.fonts.ready;

    const html2canvas = (await import('html2canvas')).default;

    const canvas = await html2canvas(cardRef.current, {
      width: 1080,
      height: 1080,
      useCORS: true,
      background: '#021a16',
      logging: false,
    });

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }, [cardRef]);

  const handleShare = useCallback(async () => {
    setSharing(true);
    try {
      const blob = await capture();
      if (!blob) return;

      const filename = `${awardId}-${slugify(leagueName)}.png`;
      const file = new File([blob], filename, { type: 'image/png' });

      if (
        typeof navigator !== 'undefined' &&
        'share' in navigator &&
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: 'FPL Mini-League Awards',
        });
      } else {
        // Fallback: trigger download
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setSharing(false);
    }
  }, [awardId, capture, leagueName]);

  return (
    <button
      onClick={handleShare}
      disabled={sharing}
      style={{
        width: '100%',
        padding: '14px 24px',
        borderRadius: 12,
        border: 'none',
        background: sharing ? 'rgba(0,255,194,0.4)' : 'var(--brand-secondary)',
        color: 'var(--brand-primary)',
        fontFamily: 'var(--font-heading)',
        fontSize: 16,
        fontWeight: 700,
        cursor: sharing ? 'wait' : 'pointer',
        transition: 'background 0.15s',
      }}
    >
      {sharing ? 'Saving…' : '↗ Share / Download'}
    </button>
  );
}
