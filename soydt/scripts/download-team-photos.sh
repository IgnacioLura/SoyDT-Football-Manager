#!/usr/bin/env bash
# Generalized version of download-nacional-photos.sh: downloads real player
# photos from Transfermarkt for every Primera División team whose source data
# (open-football-database) carries a transfermarkt.com id — same
# id-driven, best-effort approach as the original Nacional-only script, just
# looped over every team dir instead of one. No manual overrides file here
# (that pass was a one-off manual name+club search for Nacional only); most
# lower-profile squad entries across every team still lack a Transfermarkt id
# in this dataset and fall back to PlayerPage.tsx's placeholder silhouette.
#
# Usage: run from repo root: soydt/scripts/download-team-photos.sh [team-slug ...]
# With no args, runs every team dir under open-football-database's
# uruguayan-first-division data.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DATA_ROOT="$REPO_ROOT/open-football-database/data/uy/uruguayan-first-division"
IMAGES_ROOT="$REPO_ROOT/soydt/web/public/static/images/players"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

fetch_photo() {
  local out_dir="$1" engine_id="$2" tm_id="$3"

  if [ -f "$out_dir/${engine_id}.jpg" ] || [ -f "$out_dir/${engine_id}.png" ]; then
    echo "SKIP $engine_id (tm=$tm_id): already downloaded"
    return
  fi

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

  if curl -sfL -A "$UA" -o "$out_dir/${engine_id}.jpg" "$photo_url"; then
    echo "OK   $engine_id (tm=$tm_id) -> ${out_dir##*/}/${engine_id}.jpg"
  else
    echo "SKIP $engine_id (tm=$tm_id): image download failed"
  fi
  sleep 1
}

run_team() {
  local team="$1"
  local players_dir="$DATA_ROOT/$team/players"
  local out_dir="$IMAGES_ROOT/$team"
  [ -d "$players_dir" ] || { echo "SKIP team $team: no players dir"; return; }
  mkdir -p "$out_dir"

  for f in "$players_dir"/*.json; do
    tm_id=$(grep -o '"transfermarkt.com": *"[0-9]*"' "$f" | grep -o '[0-9]*' || true)
    [ -z "$tm_id" ] && continue
    engine_id=$(grep -m1 -o '"id": *[0-9]*' "$f" | grep -o '[0-9]*' || true)
    [ -z "$engine_id" ] && continue
    fetch_photo "$out_dir" "$engine_id" "$tm_id"
  done
}

if [ "$#" -gt 0 ]; then
  for team in "$@"; do run_team "$team"; done
else
  for d in "$DATA_ROOT"/*/; do
    team="$(basename "$d")"
    run_team "$team"
  done
fi
