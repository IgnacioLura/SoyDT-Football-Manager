// soydt/web/src/shared/ui/PlayerCard.tsx
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
}

function PlayerCard({ id, name, position, age, currentAbility }: PlayerCardProps) {
  const tier = ratingTier(currentAbility)
  return (
    <Link to={`/players/${id}`} className={`pc-card pc-tier-${tier}`}>
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
