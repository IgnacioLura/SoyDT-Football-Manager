// soydt/web/src/shared/ui/RatingBadge.tsx
import { useCountUp } from '../useCountUp'
import './RatingBadge.css'

export type RatingTier = 'bronze' | 'silver' | 'gold' | 'elite'

// Current ability is a u8 (engine-ffi's `current_ability: u8`) — thresholds
// below are Fase A's initial bucketing for visual tiering, not a value
// pulled from game balance data. Recalibrated against the AR/UY/BR scoped
// world's actual pool (736 free agents, max observed ~124) so gold/elite
// are reachable instead of empty tiers. Tune freely without touching callers.
export function ratingTier(value: number): RatingTier {
  if (value >= 140) return 'elite'
  if (value >= 125) return 'gold'
  if (value >= 95) return 'silver'
  return 'bronze'
}

type RatingBadgeProps = {
  value: number
  size?: 'sm' | 'lg'
}

function RatingBadge({ value, size = 'lg' }: RatingBadgeProps) {
  const tier = ratingTier(value)
  const displayed = useCountUp(value)
  return (
    <div className={`rb-badge rb-tier-${tier} rb-size-${size}`}>
      <span className="rb-value">{displayed}</span>
    </div>
  )
}

export default RatingBadge
