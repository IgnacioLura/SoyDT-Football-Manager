// soydt/web/src/shared/ui/PlayerCard.tsx
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { positionInfo } from '../positions'
import { playerPhotoOnError, playerPhotoSrc } from '../playerPhoto'
import { useOvrGrowth } from '../useOvrGrowth'
import { ratingTier } from './RatingBadge'
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
  const pos = positionInfo(position)
  const ovrGrowth = useOvrGrowth(id, currentAbility)
  return (
    <Link
      to={`/players/${id}`}
      className={`pc-card pc-tier-${tier} anim-fade-in-up`}
      style={index != null ? ({ '--i': index } as CSSProperties) : undefined}
      draggable={false}
    >
      {/* Rank/position badges live outside `.pc-shape` on purpose — that inner
          div carries the clip-path that cuts the shield silhouette, and any
          child of a clipped element gets clipped too. Keeping the badges as
          siblings lets them overflow above the shield's corners instead of
          being sliced off by it. */}
      <span className="pc-rank-value">{Math.round(currentAbility)}</span>
      {ovrGrowth > 0 && <span className="pc-growth-badge">▲ +{ovrGrowth}</span>}
      <span className="pc-pos-value" style={{ '--pos-color': pos.color } as CSSProperties}>
        {pos.code}
      </span>
      <div className="pc-shape">
        <div className="pc-photo-wrap">
          <img
            className="pc-photo"
            src={playerPhotoSrc(id)}
            onError={playerPhotoOnError}
            alt=""
            width={140}
            height={172}
            draggable={false}
          />
        </div>
        <div className="pc-nameplate">
          <div className="pc-name">{name}</div>
          <div className="pc-age">Age {age}</div>
        </div>
      </div>
    </Link>
  )
}

export default PlayerCard
