import { useState } from 'react'
import { crestPath } from './crests'

type Props = { slug: string; name: string; size?: number }

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean)
  return (words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')
}

// Falls back to an initials badge when a team has no crest file (three
// Primera División teams don't — see crests.ts) instead of a broken-image icon.
function TeamCrest({ slug, name, size = 72 }: Props) {
  const [broken, setBroken] = useState(false)

  if (broken) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg, #2c3c4a 0%, #1d2832 100%)',
          border: '1px solid #3a5468',
          color: '#88a4b8',
          fontWeight: 700,
          fontSize: size * 0.32,
        }}
      >
        {initials(name).toUpperCase()}
      </div>
    )
  }

  return (
    <img
      src={crestPath(slug)}
      alt={name}
      onError={() => setBroken(true)}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  )
}

export default TeamCrest
