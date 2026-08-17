// soydt/web/src/shared/ui/PlayerCard.tsx
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { PositionBadge } from '../positions'
import RatingBadge, { ratingTier } from './RatingBadge'
import './PlayerCard.css'

export type PlayerCardProps = {
  id: number
  name: string
  position: string
  age: number
  currentAbility: number
  // Position in the grid it renders in — staggers this card's mount-in
  // animation (`--i` consumed by `shared/motion.css`'s `.anim-fade-in-up`)
  // so a squad grid cascades in instead of popping in all at once. Omit
  // for a single card rendered on its own (e.g. outside a grid).
  index?: number
}

function PlayerCard({ id, name, position, age, currentAbility, index }: PlayerCardProps) {
  const tier = ratingTier(currentAbility)
  return (
    <Link
      to={`/players/${id}`}
      className={`pc-card pc-tier-${tier} anim-fade-in-up`}
      style={index != null ? ({ '--i': index } as CSSProperties) : undefined}
    >
      <div className="pc-top">
        <RatingBadge value={currentAbility} size="sm" />
        <PositionBadge position={position} />
      </div>
      <img
        className="pc-photo"
        src={`/static/images/players/${id}.jpg`}
        onError={(e) => {
          e.currentTarget.onerror = null
          e.currentTarget.src = '/static/images/player/placeholder-face.svg'
        }}
        alt=""
        width={72}
        height={90}
      />
      <div className="pc-name">{name}</div>
      <div className="pc-age">Age {age}</div>
    </Link>
  )
}

export default PlayerCard
