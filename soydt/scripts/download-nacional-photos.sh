#!/usr/bin/env bash
# One-off: downloads real player photos for Club Nacional's squad from
# Transfermarkt, for the subset of players whose source data (in
# open-football-database) carries a transfermarkt.com id. Every other
# player (Nacional or not) has no file here and PlayerPage.tsx falls
# back to the existing placeholder silhouette — this is expected, not
# an error, since most lower-profile squad entries lack a Transfermarkt
# id in this dataset.
#
# Usage: run from repo root: soydt/scripts/download-nacional-photos.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PLAYERS_DIR="$REPO_ROOT/open-football-database/data/uy/uruguayan-first-division/nacional/players"
OUT_DIR="$REPO_ROOT/soydt/web/public/static/images/players"
OVERRIDES_FILE="$REPO_ROOT/soydt/scripts/nacional-photo-overrides.txt"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

mkdir -p "$OUT_DIR"

fetch_photo() {
  local engine_id="$1"
  local tm_id="$2"

  local html
  html=$(curl -sf -A "$UA" -L "https://www.transfermarkt.com/x/profil/spieler/${tm_id}") || {
    echo "SKIP $engine_id (tm=$tm_id): profile page fetch failed"
    return
  }
  local photo_url
  photo_url=$(echo "$html" | grep -o 'og:image" content="[^"]*"' | head -1 | sed 's/og:image" content="//;s/"$//')
  if [ -z "$photo_url" ]; then
    echo "SKIP $engine_id (tm=$tm_id): no og:image found"
    return
  fi

  if curl -sfL -A "$UA" -o "$OUT_DIR/${engine_id}.jpg" "$photo_url"; then
    echo "OK   $engine_id (tm=$tm_id) -> ${engine_id}.jpg"
  else
    echo "SKIP $engine_id (tm=$tm_id): image download failed"
  fi
  sleep 1
}

for f in "$PLAYERS_DIR"/*.json; do
  tm_id=$(grep -o '"transfermarkt.com": *"[0-9]*"' "$f" | grep -o '[0-9]*' || true)
  if [ -z "$tm_id" ]; then
    continue
  fi
  engine_id=$(grep -m1 -o '"id": *[0-9]*' "$f" | grep -o '[0-9]*' || true)

  fetch_photo "$engine_id" "$tm_id"
done

# Extra players with no transfermarkt.com id in their source JSON, resolved
# by manual name+club-filtered search (see nacional-photo-overrides.txt for
# provenance details). Same per-entry fault tolerance as the main loop above:
# a failed fetch is skipped, not fatal.
if [ -f "$OVERRIDES_FILE" ]; then
  while read -r engine_id tm_id; do
    [ -z "${engine_id:-}" ] && continue
    case "$engine_id" in \#*) continue ;; esac
    fetch_photo "$engine_id" "$tm_id"
  done < "$OVERRIDES_FILE"
fi
