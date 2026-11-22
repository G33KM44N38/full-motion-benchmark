# Instructions pour les agents

Quand on te demande de **lancer le benchmark**, **run the benchmark**, ou d’exécuter `/benchmark` / `$benchmark` : suis [`PROMPT.md`](./PROMPT.md) de bout en bout, de façon **autonome**. Ne pose aucune question. N’attends pas de validation humaine.

Le détail du travail (prédicat de sortie, boucle poteto, `tools/evaluate`, livrables) est dans `PROMPT.md`. La procédure ci-dessous est le lancement en une commande : branche, outillage, exécution, push, liens.

`tools/`, `reference/`, `docs/` et `.github/` sont en lecture seule. Ne les modifie pas.

## Lancer le benchmark

1. **Identifie-toi.** Dérive un nom à partir de ta propre identité (produit et, si tu la connais, le modèle). Ne demande pas le nom. Transforme-le en slug : minuscules, chiffres, tirets uniquement (ex. `claude-opus`, `claude-sonnet`, `codex`, `gpt-5`, `cursor`).

2. **Crée une branche à partir de `main`.** Horodatage en Europe/Paris, format `yyyymmdd-hhmm` :

   ```bash
   git fetch origin main 2>/dev/null || true
   git checkout main
   git pull --ff-only origin main 2>/dev/null || true
   stamp=$(TZ=Europe/Paris date +%Y%m%d-%H%M)
   git checkout -b "run/<slug>-${stamp}"
   ```

   Remplace `<slug>` par le slug calculé à l’étape 1. Si le worktree n’est pas propre, mets les changements de côté (`git stash`) plutôt que de les jeter, puis repars de `main`.

3. **Prépare l’outil d’évaluation :**

   ```bash
   cd tools
   npm install
   npx playwright install chromium
   cd ..
   ```

4. **Exécute `PROMPT.md` entièrement**, y compris la boucle autonome (prédicat figé, plus petit changement, `npm run evaluate` dans `tools/`, commit si ça avance sinon revert, journal dans `verification/decision-log.md`). Continue jusqu’à ce que le prédicat soit vrai (evaluate code 0) ou qu’une impasse réelle soit documentée dans `verification/REPORT.md`. Commit régulièrement. Travaille dans `site/`, preuves dans `verification/`.

5. **Pousse la branche :**

   ```bash
   git push -u origin HEAD
   ```

6. **Affiche les liens**, sans demander. Alias Cloudflare : minuscules, chaque caractère hors `[a-z0-9-]` devient `-`, trim des `-` en tête et en queue, troncature à 28 caractères (les tirets consécutifs sont conservés ; pas de retrim après coupe). Utilise le script du dépôt :

   ```bash
   branch=$(git branch --show-current)
   python3 tools/pages-alias.py --url "$branch"
   ```

   Exemple : `run/claude-opus-20261122-2005` → `https://run-claude-opus-20261122-200.full-motion-benchmark.pages.dev`

   Lien GitHub Actions (adapte `owner/repo` à partir de `git remote get-url origin`) :

   `https://github.com/<owner>/<repo>/actions/workflows/deploy.yml?query=branch%3A<branche-encodée>`

   La CI construit, relance evaluate (sans bloquer le déploiement) et publie le site. Le résumé du job reprend l’URL et le score. Le site n’est visible qu’après le succès du workflow, et seulement si tu as le droit de push sur ce dépôt (un fork ne déploie pas).
