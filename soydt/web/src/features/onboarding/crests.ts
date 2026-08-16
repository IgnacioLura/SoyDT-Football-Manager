// Crest filenames under public/static/images/teams don't line up 1:1 with
// the engine's team slugs (underscore vs hyphen, and a few teams renamed or
// missing a "montevideo" affix) — this maps the few known mismatches;
// everything else falls back to a straight hyphen→underscore conversion.
// Three Primera División teams (river-plate-montevideo, miramar-misiones,
// plaza-colonia) have no crest file at all — `TeamCrest` falls back to an
// initials badge for those via its `onError` handler.
const CREST_ALIASES: Record<string, string> = {
  'liverpool-montevideo': 'liverpool',
  'racing-montevideo': 'racing',
  wanderers: 'montevideo_wanderers',
}

export function crestPath(slug: string): string {
  const base = CREST_ALIASES[slug] ?? slug.replace(/-/g, '_')
  return `/static/images/teams/${base}.png`
}
