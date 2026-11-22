#!/usr/bin/env python3
"""Write score fields from verification/score.json to GITHUB_OUTPUT."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

score_path = Path(sys.argv[1] if len(sys.argv) > 1 else "../verification/score.json")
if not score_path.exists():
    print(f"missing {score_path}", file=sys.stderr)
    sys.exit(1)

data = json.loads(score_path.read_text())
pred = data.get("predicate") or {}
score = data.get("score", "")
threshold = data.get("threshold", "")
passed = "true" if pred.get("passed") else "false"
dest = os.environ.get("GITHUB_OUTPUT")
if dest:
    with open(dest, "a", encoding="utf-8") as f:
        f.write(f"score={score}\n")
        f.write(f"threshold={threshold}\n")
        f.write(f"passed={passed}\n")
print(f"score={score} passed={passed} threshold={threshold}")
