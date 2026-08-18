// soydt/web/src/shared/ui/PlayerCard.tsx
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { positionInfo } from '../positions'
import { playerPhotoOnError, playerPhotoSrc } from '../playerPhoto'
import { useOvrGrowth } from '../useOvrGrowth'
import { ratingTier, type RatingTier } from './RatingBadge'

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

const TIER_SHAPE_BG: Record<RatingTier, string> = {
  bronze: 'linear-gradient(165deg, var(--tier-bronze) 0%, var(--surface-0) 72%)',
  silver: 'linear-gradient(165deg, var(--tier-silver) 0%, var(--surface-0) 72%)',
  gold: 'linear-gradient(165deg, var(--tier-gold) 0%, var(--surface-0) 72%)',
  elite: 'linear-gradient(165deg, var(--accent-primary) 0%, var(--surface-0) 72%)',
}

const TIER_RANK_COLOR: Record<RatingTier, string> = {
  bronze: 'var(--tier-bronze)',
  silver: 'var(--tier-silver)',
  gold: 'var(--tier-gold)',
  elite: 'var(--accent-primary)',
}

// Card-body radial specular per tier (see DESIGN_SYSTEM.md) — bronze/silver
// only had the flat linear tier gradient; gold/elite get an extra faint
// radial sheen across the body.
const TIER_HAS_SHEEN: Record<RatingTier, boolean> = {
  bronze: false,
  silver: false,
  gold: true,
  elite: true,
}

const TIER_HOVER_GLOW: Record<RatingTier, string> = {
  bronze: 'drop-shadow(var(--shadow-card))',
  silver: 'drop-shadow(var(--shadow-card))',
  gold: 'drop-shadow(var(--shadow-card)) drop-shadow(0 0 12px rgba(var(--tier-gold-rgb), 0.4))',
  elite: 'drop-shadow(var(--shadow-card)) drop-shadow(0 0 14px rgba(var(--accent-primary-rgb), 0.5))',
}

function PlayerCard({ id, name, position, age, currentAbility, index }: PlayerCardProps) {
  const tier = ratingTier(currentAbility)
  const pos = positionInfo(position)
  const ovrGrowth = useOvrGrowth(id, currentAbility)

  return (
    <Link
      to={`/players/${id}`}
      className="group relative block h-[236px] w-44 text-text-primary no-underline transition-transform duration-base ease-out hover:-translate-y-1 hover:scale-[1.03]"
      style={index != null ? ({ '--i': index } as CSSProperties) : undefined}
      draggable={false}
    >
      {/* Rank/position badges live outside the clipped shape on purpose —
          that inner div carries the clip-path that cuts the shield
          silhouette, and any child of a clipped element gets clipped too.
          Keeping the badges as siblings lets them overflow above the
          shield's corners instead of being sliced off by it. */}
      <span
        className="absolute -top-[10px] left-3 z-[4] flex h-[42px] w-[42px] animate-pc-badge-in-left items-center justify-center rounded-full border-2 border-white/65 font-display text-xl font-bold italic leading-none text-surface-0 shadow-[0_3px_8px_rgba(0,0,0,0.55)]"
        style={{ background: `radial-gradient(circle at 32% 28%, #fff8 0%, transparent 45%), ${TIER_RANK_COLOR[tier]}` }}
      >
        {Math.round(currentAbility)}
      </span>
      {ovrGrowth > 0 && (
        <span className="absolute left-3 top-8 z-[5] min-w-[42px] animate-pc-badge-in-left whitespace-nowrap rounded-lg bg-[#4ade80] px-1 py-px text-center font-display text-[11px] font-bold text-[#052e16] shadow-[0_2px_4px_rgba(0,0,0,0.4)] [animation-delay:0.08s]">
          ▲ +{ovrGrowth}
        </span>
      )}
      <span
        className="absolute -top-[10px] right-3 z-[4] flex h-[42px] w-[42px] animate-pc-badge-in-right items-center justify-center rounded-full border-2 border-white/65 font-display text-sm font-bold italic leading-none text-text-primary shadow-[0_3px_8px_rgba(0,0,0,0.55)]"
        style={{ background: `radial-gradient(circle at 32% 28%, #fff5 0%, transparent 45%), ${pos.color}` }}
      >
        {pos.code}
      </span>
      <div
        className="relative isolate flex h-full w-full flex-col items-center px-2 pb-4 pt-3 transition-[filter] duration-base ease-linear [clip-path:polygon(50%_0%,88%_8%,100%_36%,100%_82%,50%_100%,0%_82%,0%_36%,12%_8%)] group-hover:[filter:var(--pc-hover-glow)]"
        style={
          {
            background: TIER_SHAPE_BG[tier],
            filter: 'drop-shadow(var(--shadow-card))',
            '--pc-hover-glow': TIER_HOVER_GLOW[tier],
          } as CSSProperties
        }
      >
        {TIER_HAS_SHEEN[tier] && (
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_12%,rgba(255,255,255,0.16),transparent_60%)]" />
        )}
        {/* FUT-style specular sweep on hover — an oversized diagonal
            gradient bar, parked off-screen at rest and only animated
            across while the card is hovered. */}
        <div className="pointer-events-none absolute -inset-1/2 z-[3] -translate-x-[120%] bg-[linear-gradient(115deg,transparent_40%,rgba(255,255,255,0.28)_50%,transparent_60%)] group-hover:animate-pc-card-shine" />
        <div className="mt-[-8px] flex flex-1 items-end justify-center">
          <img
            className="object-cover [mask-image:radial-gradient(ellipse_68%_82%_at_50%_40%,black_55%,transparent_100%)]"
            src={playerPhotoSrc(id)}
            onError={playerPhotoOnError}
            alt=""
            width={140}
            height={172}
            draggable={false}
          />
        </div>
        <div className="z-[2] flex w-[78%] flex-col items-center gap-px border-t border-white/25 pt-1">
          <div className="text-center font-display text-sm font-bold italic tracking-[0.02em] [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
            {name}
          </div>
          <div className="text-[11px] text-text-muted">Age {age}</div>
        </div>
      </div>
    </Link>
  )
}

export default PlayerCard
