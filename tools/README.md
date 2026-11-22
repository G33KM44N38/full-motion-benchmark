# Outils

- `shoot.js` : script Playwright utilisé pour produire les captures et les mesures DOM du site d’origine. Dépendance : `playwright` (voir `package.json`). Les chemins de sortie d’origine étaient `../reference/` et `../dom/` ; dans ce dépôt, les captures officielles sont déjà dans `reference/` (JPEG) et les JSON dans `docs/dom/`.
- `update-runs-index.py` : utilisé par la CI après un déploiement réussi. Met à jour `runs.json` et génère un `index.html` sur la branche `results`.
