#!/usr/bin/env python3
"""One-off: downloads real player photos for every remaining Primera
Division team by fetching each club's Transfermarkt squad page (club id
comes from club.json's "ids"."transfermarkt.com") and name-matching each
row against our own player JSON files, rather than requiring a
transfermarkt.com id on the *player* record (most players don't have one —
see download-team-photos.sh). Nacional and Penarol already have curated
photo sets from earlier passes and are skipped by default.

Usage: run from repo root: python soydt/scripts/download_squad_photos.py [team-slug ...]
With no args, runs every team dir except nacional/penarol.
"""
import json
import re
import sys
import time
import unicodedata
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_ROOT = REPO_ROOT / "open-football-database" / "data" / "uy" / "uruguayan-first-division"
IMAGES_ROOT = REPO_ROOT / "soydt" / "web" / "public" / "static" / "images" / "players"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
SKIP_TEAMS = {"nacional", "penarol"}

NAME_RE = re.compile(r'<a[^>]*href="/([a-z0-9-]+)/profil/spieler/(\d+)"[^>]*>')
PHOTO_RE = re.compile(r'data-src="(https://img\.a\.transfermarkt\.technology/portrait/medium/(\d+)-[^"]*)"')


def normalize(name: str) -> str:
    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    name = re.sub(r"[^a-z0-9]+", " ", name.lower()).strip()
    return " ".join(sorted(name.split()))


def fetch(url: str) -> str | None:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except Exception as e:
        print(f"    fetch failed {url}: {e}")
        return None


def squad_photos(club_tm_id: str) -> dict[str, str]:
    """Returns {normalized_slug_name: photo_url} for a club's current squad."""
    html = fetch(f"https://www.transfermarkt.com/x/kader/verein/{club_tm_id}")
    if not html:
        return {}
    names = dict(NAME_RE.findall(html))  # slug -> tm_id
    photos = {tm_id: url for url, tm_id in PHOTO_RE.findall(html)}
    result = {}
    for slug, tm_id in names.items():
        url = photos.get(tm_id)
        if not url or url.endswith("default.jpg"):
            continue
        result[normalize(slug.replace("-", " "))] = url
    return result


def run_team(team: str) -> None:
    players_dir = DATA_ROOT / team / "players"
    club_file = DATA_ROOT / team / "club.json"
    out_dir = IMAGES_ROOT / team
    if not players_dir.is_dir() or not club_file.is_file():
        print(f"SKIP team {team}: missing players dir or club.json")
        return
    club = json.loads(club_file.read_text(encoding="utf-8"))
    club_tm_id = club.get("ids", {}).get("transfermarkt.com")
    if not club_tm_id:
        print(f"SKIP team {team}: no transfermarkt club id")
        return

    print(f"=== {team} (tm club id {club_tm_id}) ===")
    squad = squad_photos(club_tm_id)
    if not squad:
        print("  no squad data found")
        return
    time.sleep(1)

    out_dir.mkdir(parents=True, exist_ok=True)
    for f in sorted(players_dir.glob("*.json")):
        data = json.loads(f.read_text(encoding="utf-8"))
        engine_id = data["id"]
        if (out_dir / f"{engine_id}.jpg").exists() or (out_dir / f"{engine_id}.png").exists():
            continue
        full_name = f"{data.get('first_name', '')} {data.get('last_name', '')}"
        key = normalize(full_name)
        url = squad.get(key)
        if not url:
            continue
        ext = ".png" if url.lower().endswith(".png") else ".jpg"
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                (out_dir / f"{engine_id}{ext}").write_bytes(resp.read())
            print(f"  OK   {engine_id} ({full_name.strip()}) -> {team}/{engine_id}{ext}")
        except Exception as e:
            print(f"  SKIP {engine_id} ({full_name.strip()}): download failed: {e}")
        time.sleep(0.3)


def main() -> None:
    teams = sys.argv[1:] or [d.name for d in sorted(DATA_ROOT.iterdir()) if d.is_dir() and d.name not in SKIP_TEAMS]
    for team in teams:
        run_team(team)


if __name__ == "__main__":
    main()
