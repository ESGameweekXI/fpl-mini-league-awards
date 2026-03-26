'use client';

interface FallbackCardProps {
  awardName: string;
  reason?: string;
}

export default function FallbackCard({ awardName, reason }: FallbackCardProps) {
  return (
    <div className="award-card">
      <div className="award-card__bg-accent" />
      <div className="award-card__icon">❓</div>
      <div className="award-card__name">{awardName}</div>
      <div className="award-card__description">
        {reason ?? 'Not enough data to calculate this award.'}
      </div>
    </div>
  );
}
