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
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

mkdir -p "$OUT_DIR"

for f in "$PLAYERS_DIR"/*.json; do
  tm_id=$(grep -o '"transfermarkt.com": *"[0-9]*"' "$f" | grep -o '[0-9]*' || true)
  if [ -z "$tm_id" ]; then
    continue
  fi
  engine_id=$(grep -o '"id": *[0-9]*' "$f" | head -1 | grep -o '[0-9]*')

  html=$(curl -sf -A "$UA" -L "https://www.transfermarkt.com/x/profil/spieler/${tm_id}") || {
    echo "SKIP $engine_id (tm=$tm_id): profile page fetch failed"
    continue
  }
  photo_url=$(echo "$html" | grep -o 'og:image" content="[^"]*"' | head -1 | sed 's/og:image" content="//;s/"$//')
  if [ -z "$photo_url" ]; then
    echo "SKIP $engine_id (tm=$tm_id): no og:image found"
    continue
  fi

  if curl -sfL -A "$UA" -o "$OUT_DIR/${engine_id}.jpg" "$photo_url"; then
    echo "OK   $engine_id (tm=$tm_id) -> ${engine_id}.jpg"
  else
    echo "SKIP $engine_id (tm=$tm_id): image download failed"
  fi
  sleep 1
done
