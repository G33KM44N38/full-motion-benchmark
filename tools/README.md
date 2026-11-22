# Outils

## Auto-évaluation — `evaluate.mjs`

Juge officiel du run. Compare `site/` aux captures de `reference/` et aux mesures de `docs/dom/`.

```bash
cd tools
npm install
npx playwright install chromium
npm run evaluate
```

- Sert `site/dist` (lance `npm run build` dans `site/` si besoin).
- Capture chaque page mappée en 1440×900 et 390×844 (premier écran + page entière).
- Diff pixel (pixelmatch, après redimensionnement à la même largeur). Les zones médias sont masquées : le diff brut serait trompeur à cause des images du client.
- Comparaison de boîtes (position, taille, colonnes) avec `docs/dom/`.
- Écrit `verification/score.json` (score /100 aligné sur la grille du prompt) et les diffs dans `verification/diffs/`.
- Code de sortie **0 uniquement** si le prédicat est vrai (toutes les cases OK aux deux viewports, score ≥ 85, aucun écart structurel). Seuil : `EVALUATE_THRESHOLD` (défaut 85).

`tools/`, `reference/` et `docs/` sont en lecture seule pour l'agent. Ne pas modifier l'évaluateur pour « passer ».

## Autres

- `shoot.js` : script Playwright qui a produit les captures et les mesures du site d'origine. Les livrables officiels sont déjà dans `reference/` (JPEG) et `docs/dom/`.
- `update-runs-index.py` : utilisé par la CI après un déploiement. Met à jour `runs.json` (y compris le score) et l'`index.html` sur la branche `results`.

- `pages-alias.py` : calcule l'alias de branche Cloudflare Pages (et l'URL avec `--url`).

