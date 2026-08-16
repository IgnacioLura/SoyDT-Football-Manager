import type { JSX, ReactNode } from 'react'

type IconProps = { className?: string }

const base = (children: ReactNode, props: IconProps = {}) => (
  <svg
    className={props.className}
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
)

export const ATTRIBUTE_ICONS: Record<string, (props?: IconProps) => JSX.Element> = {
  // Technical
  corners: (p) => base(<><path d="M4 3v18" /><path d="M4 3h8l-3 4 3 4H4" /></>, p),
  crossing: (p) => base(<><path d="M4 4l16 16" /><path d="M20 4L4 20" /></>, p),
  dribbling: (p) => base(<><path d="M3 18c3-6 6 6 9 0s6-6 9 0" /><circle cx="12" cy="8" r="2" /></>, p),
  finishing: (p) => base(<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>, p),
  firstTouch: (p) => base(<><circle cx="9" cy="9" r="2" /><path d="M11 11l8 8" /></>, p),
  freeKicks: (p) => base(<><path d="M3 20c4-10 14-10 18-16" strokeDasharray="3 3" /><circle cx="21" cy="4" r="1.5" /></>, p),
  heading: (p) => base(<><circle cx="12" cy="7" r="4" /><path d="M12 11v6" /><path d="M17 9l4-2" /></>, p),
  longShots: (p) => base(<><path d="M3 20L20 4" /><path d="M13 4h7v7" /></>, p),
  longThrows: (p) => base(<><path d="M4 20c4-8 12-8 16-16" /><circle cx="20" cy="4" r="1.5" /></>, p),
  marking: (p) => base(<><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 12h8" /></>, p),
  passing: (p) => base(<><path d="M4 12h13" /><path d="M13 6l6 6-6 6" /></>, p),
  penaltyTaking: (p) => base(<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></>, p),
  tackling: (p) => base(<><path d="M4 18l7-10" /><path d="M11 8l9 4" /></>, p),
  technique: (p) => base(<path d="M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z" />, p),

  // Mental
  aggression: (p) => base(<path d="M8 12a4 4 0 118 0v3a4 4 0 01-8 0zM8 12l-3-2m11 2l3-2" />, p),
  anticipation: (p) => base(<><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>, p),
  bravery: (p) => base(<><path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z" /><path d="M9 12l2 2 4-4" /></>, p),
  composure: (p) => base(<><circle cx="12" cy="12" r="8" /><path d="M8 13c1.5 2 6.5 2 8 0" /></>, p),
  concentration: (p) => base(<><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="0.7" fill="currentColor" /></>, p),
  decisions: (p) => base(<><path d="M12 3v6" /><path d="M12 9l-6 12h12z" /></>, p),
  determination: (p) => base(<path d="M12 21c-4-3-6-6-6-9a6 6 0 0112 0c0 3-2 6-6 9z" />, p),
  flair: (p) => base(<><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><circle cx="12" cy="12" r="3" /></>, p),
  leadership: (p) => base(<><path d="M4 19h16" /><path d="M6 19V9l3 3 3-6 3 6 3-3v10" /></>, p),
  offTheBall: (p) => base(<><circle cx="6" cy="6" r="2" strokeDasharray="2 2" /><path d="M6 8v6l4 2M10 14l6-2" /></>, p),
  positioning: (p) => base(<><path d="M12 21s7-6.5 7-12a7 7 0 00-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></>, p),
  teamwork: (p) => base(<><circle cx="8" cy="10" r="3" /><circle cx="16" cy="10" r="3" /><path d="M4 20c0-3 2-5 4-5s4 2 4 5M12 20c0-3 2-5 4-5s4 2 4 5" /></>, p),
  vision: (p) => base(<><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z" /><circle cx="12" cy="12" r="2.5" /></>, p),
  workRate: (p) => base(<><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 3" strokeWidth="2" /></>, p),

  // Physical
  acceleration: (p) => base(<><path d="M3 17l5-5 4 4 8-8" /><path d="M14 8h6v6" /></>, p),
  agility: (p) => base(<path d="M5 19l4-6-3-3 5-2 2 4 6-6M15 6l3 1" />, p),
  balance: (p) => base(<><path d="M12 3v6" /><path d="M4 15h16" /><path d="M4 15l3-6h10l3 6" /></>, p),
  jumping: (p) => base(<><path d="M12 3v6" /><path d="M9 7l3 2 3-2" /><path d="M6 21c2-6 4-8 6-8s4 2 6 8" /></>, p),
  naturalFitness: (p) => base(<path d="M12 20s-7-4.4-7-10a4 4 0 018-1 4 4 0 018 1c0 5.6-7 10-7 10z" />, p),
  pace: (p) => base(<path d="M13 2L4 14h6l-1 8 9-12h-6z" />, p),
  stamina: (p) => base(<><rect x="3" y="8" width="16" height="8" rx="1" /><path d="M21 10v4" /><path d="M6 10v4M9 10v4M12 10v4" /></>, p),
  strength: (p) => base(<><circle cx="5" cy="12" r="2.5" /><circle cx="19" cy="12" r="2.5" /><path d="M7.5 12h9" strokeWidth="3" /></>, p),
  matchReadiness: (p) => base(<><circle cx="12" cy="12" r="8" /><path d="M9 12l2 2 4-4" /></>, p),

  // Goalkeeping-only
  aerialReach: (p) => base(<><path d="M12 20V8" /><path d="M8 12l4-4 4 4" /></>, p),
  commandOfArea: (p) => base(<><rect x="4" y="4" width="16" height="16" rx="1" /><path d="M12 8v8M8 12h8" strokeDasharray="2 2" /></>, p),
  communication: (p) => base(<><path d="M4 5h13v9H9l-5 4z" /></>, p),
  eccentricity: (p) => base(<path d="M9 9a3 3 0 116 0c0 2-3 2-3 5M12 18v.01" />, p),
  handling: (p) => base(<><circle cx="12" cy="9" r="3" /><path d="M6 20c0-3 2.5-5 6-5s6 2 6 5" /></>, p),
  kicking: (p) => base(<><path d="M4 18l6-3 3-7 6 4-4 3" /><circle cx="18" cy="7" r="1.5" /></>, p),
  oneOnOnes: (p) => base(<><circle cx="7" cy="12" r="3" /><circle cx="17" cy="12" r="3" /><path d="M10 12h4" /></>, p),
  punching: (p) => base(<><path d="M12 21v-7" /><path d="M8 10l4-4 4 4" /><rect x="9" y="4" width="6" height="4" rx="1" /></>, p),
  reflexes: (p) => base(<><path d="M4 12h4l2-5 4 10 2-5h4" /></>, p),
  rushingOut: (p) => base(<><path d="M4 12h13" /><path d="M11 6l6 6-6 6" strokeWidth="2" /></>, p),
  throwing: (p) => base(<><path d="M4 20c4-8 12-8 16-16" strokeDasharray="4 2" /><circle cx="20" cy="4" r="1.5" /></>, p),
}
