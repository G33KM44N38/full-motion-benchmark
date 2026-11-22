---
name: benchmark
description: Lance le benchmark Full Motion de bout en bout (reproduction autonome du design, evaluate, push, liens).
---

# Benchmark Full Motion

Quand cette commande est invoquée, **lance le benchmark maintenant**. Ne pose aucune question. Suis [AGENTS.md](../../AGENTS.md) (section « Lancer le benchmark ») et exécute [PROMPT.md](../../PROMPT.md) de bout en bout, de façon autonome.

## Déroulement

1. **Identité.** Dérive un slug à partir de ta propre identité (produit et, si tu la connais, le modèle) : minuscules, chiffres, tirets (ex. `claude-opus`, `codex`). Ne demande pas le nom à l’humain.

2. **Branche depuis `main`.** Horodatage Europe/Paris `yyyymmdd-hhmm` :

   ```bash
   git fetch origin main 2>/dev/null || true
   git checkout main
   git pull --ff-only origin main 2>/dev/null || true
   stamp=$(TZ=Europe/Paris date +%Y%m%d-%H%M)
   git checkout -b "run/<slug>-${stamp}"
   ```

   Si le worktree n’est pas propre, `git stash` plutôt que d’écraser le travail, puis repars de `main`.

3. **Outillage d’évaluation :**

   ```bash
   cd tools && npm install && npx playwright install chromium && cd ..
   ```

4. **Exécute `PROMPT.md` en entier**, y compris la boucle autonome poteto avec `tools/evaluate` jusqu’à ce que le prédicat de sortie soit vrai (code 0) ou qu’une impasse réelle soit documentée. Commit régulièrement. `tools/`, `reference/`, `docs/` et `.github/` sont en lecture seule. Travail dans `site/`, preuves dans `verification/`.

5. **Pousse :**

   ```bash
   git push -u origin HEAD
   ```

6. **Affiche les liens.** Alias Cloudflare (minuscules, caractères hors `[a-z0-9-]` → `-`, trim des `-` aux extrémités, coupe à 28 caractères) :

   ```bash
   branch=$(git branch --show-current)
   python3 tools/pages-alias.py --url "$branch"
   ```

   Puis le suivi GitHub Actions, en déduisant `owner/repo` de `origin` :

   `https://github.com/<owner>/<repo>/actions/workflows/deploy.yml?query=branch%3A<branche-encodée>`
