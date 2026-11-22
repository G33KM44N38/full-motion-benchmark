#!/usr/bin/env python3
"""Cloudflare Pages preview branch alias.

Matches the documented Pages algorithm (Walshy, 2023):
lowercase, each non [a-z0-9-] becomes '-', trim leading/trailing '-',
truncate to 28 characters (no collapse of consecutive dashes, no re-trim
after truncate). If nothing usable remains, Pages would pick a random
'branch-…' name; this script then prints 'branch-unknown'.
"""
from __future__ import annotations

import argparse
import re
import sys

MAX_ALIAS_LENGTH = 28
DEFAULT_PROJECT = "full-motion-benchmark"


def branch_alias(branch: str) -> str:
    normalised = re.sub(r"[^a-z0-9-]", "-", branch.lower()).strip("-")
    if not normalised:
        return "branch-unknown"
    if len(normalised) > MAX_ALIAS_LENGTH:
        return normalised[:MAX_ALIAS_LENGTH]
    return normalised


def main() -> None:
    parser = argparse.ArgumentParser(description="Compute a Cloudflare Pages branch alias.")
    parser.add_argument("branch", help="Git branch name, e.g. run/claude-opus-20261122-2005")
    parser.add_argument(
        "--project",
        default=DEFAULT_PROJECT,
        help=f"Pages project subdomain (default: {DEFAULT_PROJECT})",
    )
    parser.add_argument("--url", action="store_true", help="Print the https://<alias>.<project>.pages.dev URL")
    args = parser.parse_args()
    alias = branch_alias(args.branch)
    if args.url:
        print(f"https://{alias}.{args.project}.pages.dev")
    else:
        print(alias)


if __name__ == "__main__":
    sys.exit(main())
