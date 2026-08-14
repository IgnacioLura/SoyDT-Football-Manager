// Ported 1:1 from open-football's flag convention: two classes together,
// base `.flag` (sizing, style.css) + `.flag-{lowercase ISO code}`
// (background-image, flags.css) — see migration plan / CONTRACT notes.
function Flag({ code }: { code: string }) {
  return <span className={`flag flag-${code.toLowerCase()}`} />
}

export default Flag
