#!/usr/bin/env python3
"""Append a run to runs.json and regenerate a simple index.html listing."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path

PARIS = timezone(timedelta(hours=1), name="Europe/Paris")
# Fixed offset is only a fallback; prefer zoneinfo when available.
try:
    from zoneinfo import ZoneInfo

    PARIS = ZoneInfo("Europe/Paris")
except Exception:
    pass


INDEX_HTML = """<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Full Motion — benchmark des modèles</title>
  <style>
    :root {
      --bg: #080808;
      --surface: #17191c;
      --ink: #f5f5f7;
      --muted: #a1a1a6;
      --line: #ffffff14;
      --orange: #ff784f;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
      background: var(--bg);
      color: var(--ink);
    }
    main { max-width: 960px; margin: 0 auto; padding: 48px 24px 80px; }
    h1 { font-size: 28px; font-weight: 600; margin: 0 0 8px; }
    .lede { color: var(--muted); margin: 0 0 32px; }
    .grid { display: grid; gap: 16px; }
    @media (min-width: 700px) { .grid { grid-template-columns: 1fr 1fr; } }
    a.card {
      display: block;
      text-decoration: none;
      color: inherit;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 20px 22px;
    }
    a.card:hover { border-color: #ffffff33; }
    .name { font-size: 20px; font-weight: 600; margin: 0 0 8px; }
    .meta { color: var(--muted); font-size: 14px; line-height: 1.5; margin: 0; }
    .cta { color: var(--orange); font-size: 14px; margin: 14px 0 0; }
    .empty { color: var(--muted); }
    footer { margin-top: 40px; color: var(--muted); font-size: 12px; }
  </style>
</head>
<body>
  <main>
    <h1>Benchmark Full Motion</h1>
    <p class="lede">Reproductions du design de full-motion.fr par différents modèles. Clique une carte pour ouvrir le site déployé.</p>
    <div class="grid">
      {cards}
    </div>
    <footer>Index généré automatiquement après chaque push sur une branche <code>run/**</code>.</footer>
  </main>
</body>
</html>
"""


def slug_from_branch(branch: str) -> str:
    return branch.replace("/", "-")


def model_from_branch(branch: str) -> str:
    prefix = "run/"
    if branch.startswith(prefix) and branch[len(prefix):]:
        return branch[len(prefix):]
    return branch


def load_runs(path: Path) -> list:
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text())
    except json.JSONDecodeError:
        return []
    return data if isinstance(data, list) else []


def card_html(run: dict) -> str:
    name = run.get("model") or run.get("branch") or "run"
    url = run.get("alias_url") or run.get("deployment_url") or "#"
    branch = run.get("branch", "")
    sha = (run.get("commit") or "")[:7]
    date = run.get("date") or ""
    return (
        f'<a class="card" href="{url}">'
        f'<p class="name">{name}</p>'
        f'<p class="meta">Branche <code>{branch}</code><br>'
        f'{date} · {sha}</p>'
        f'<p class="cta">Ouvrir le site →</p>'
        f"</a>"
    )


def render_index(runs: list) -> str:
    if not runs:
        cards = '<p class="empty">Aucun run pour le moment.</p>'
    else:
        cards = "\n      ".join(card_html(r) for r in runs)
    return INDEX_HTML.replace("{cards}", cards)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dir", required=True, help="Checkout of the results branch")
    parser.add_argument("--branch", required=True)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--deployment-url", default="")
    parser.add_argument("--alias-url", default="")
    parser.add_argument("--repo", default="")
    args = parser.parse_args()

    dest = Path(args.dir)
    dest.mkdir(parents=True, exist_ok=True)
    runs_path = dest / "runs.json"

    now = datetime.now(PARIS)
    entry = {
        "model": model_from_branch(args.branch),
        "branch": args.branch,
        "slug": slug_from_branch(args.branch),
        "date": now.strftime("%Y-%m-%d %H:%M %Z"),
        "commit": args.commit,
        "deployment_url": args.deployment_url,
        "alias_url": args.alias_url or args.deployment_url,
        "repo": args.repo,
    }

    runs = load_runs(runs_path)
    # Replace an existing entry for the same branch (latest deploy wins), keep others.
    runs = [r for r in runs if r.get("branch") != args.branch]
    runs.append(entry)
    runs.sort(key=lambda r: r.get("date") or "", reverse=True)

    runs_path.write_text(json.dumps(runs, indent=2, ensure_ascii=False) + "\n")
    (dest / "index.html").write_text(render_index(runs), encoding="utf-8")
    print(f"Recorded {entry['branch']} → {entry['alias_url']} ({len(runs)} run(s))")


if __name__ == "__main__":
    main()
