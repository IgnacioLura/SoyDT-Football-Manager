// Engine skill values run 1.0–20.0 (see open-football's PlayerSkills).
// Bands mirror the classic FM-style read: weak / average / strong.
export type AttributeColor = 'red' | 'yellow' | 'green'

export function attributeColor(value: number): AttributeColor {
  if (value <= 8) return 'red'
  if (value <= 13) return 'yellow'
  return 'green'
}
