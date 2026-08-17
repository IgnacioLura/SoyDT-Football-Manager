// soydt/web/src/shared/ui/RatingBadge.tsx
import './RatingBadge.css'

export type RatingTier = 'bronze' | 'silver' | 'gold' | 'elite'

// Current ability is a u8 (engine-ffi's `current_ability: u8`) — thresholds
// below are Fase A's initial bucketing for visual tiering, not a value
// pulled from game balance data. Tune freely without touching callers.
export function ratingTier(value: number): RatingTier {
  if (value >= 160) return 'elite'
  if (value >= 130) return 'gold'
  if (value >= 100) return 'silver'
  return 'bronze'
}

type RatingBadgeProps = {
  value: number
  size?: 'sm' | 'lg'
}

function RatingBadge({ value, size = 'lg' }: RatingBadgeProps) {
  const tier = ratingTier(value)
  return (
    <div className={`rb-badge rb-tier-${tier} rb-size-${size}`}>
      <span className="rb-value">{Math.round(value)}</span>
    </div>
  )
}

export default RatingBadge
