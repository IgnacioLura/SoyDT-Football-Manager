// soydt/web/src/shared/ui/RatingBadge.tsx
import { useCountUp } from '../useCountUp'

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

const TIER_CLASSES: Record<RatingTier, string> = {
  bronze: 'border-tier-bronze bg-[linear-gradient(155deg,var(--tier-bronze),var(--surface-2))]',
  silver: 'border-tier-silver bg-[linear-gradient(155deg,var(--tier-silver),var(--surface-2))] text-surface-0',
  gold: 'border-tier-gold bg-[linear-gradient(155deg,var(--tier-gold),var(--surface-2))] text-surface-0',
  elite:
    'border-accent-primary bg-[linear-gradient(155deg,var(--accent-primary),var(--surface-2))] text-surface-0 animate-rb-elite-pulse',
}

const SIZE_CLASSES: Record<'sm' | 'lg', string> = {
  lg: 'w-16 h-16 text-[28px]',
  sm: 'w-9 h-9 text-base',
}

function RatingBadge({ value, size = 'lg' }: RatingBadgeProps) {
  const tier = ratingTier(value)
  const displayed = useCountUp(value)
  return (
    <div
      className={`inline-flex items-center justify-center rounded-card border-2 border-transparent font-display font-bold italic text-text-primary shadow-card ${SIZE_CLASSES[size]} ${TIER_CLASSES[tier]}`}
    >
      <span className="leading-none">{displayed}</span>
    </div>
  )
}

export default RatingBadge
