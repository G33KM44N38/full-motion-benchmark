# Benchmark Full Motion

Dépôt de comparaison de modèles / agents de code (Codex, Claude Code, etc.) : chacun doit **reproduire le design et la structure** de [full-motion.fr](https://full-motion.fr/) en utilisant uniquement les **images du client** fournies ici.

On juge la **fidélité visuelle**, pas les fonctionnalités. Le prompt est identique pour tout le monde : [`PROMPT.md`](./PROMPT.md). La grille de notation est à la fin de ce prompt.

Quand un ami pousse sa branche `run/<modele>`, GitHub Actions construit le site et le déploie sur **Cloudflare Pages**. Tu obtiens un lien direct, du type :

`https://run-claude-opus.full-motion-benchmark.pages.dev`

Un index de toutes les versions est aussi mis à jour : `https://results.full-motion-benchmark.pages.dev` (après le premier run).

## Contenu du dépôt

| Chemin | Rôle |
|---|---|
| [`PROMPT.md`](./PROMPT.md) | Prompt à donner tel quel à l’agent |
| [`docs/structure-full-motion.md`](./docs/structure-full-motion.md) | Spec structurelle du site d’origine |
| [`reference/`](./reference/) | 48 captures de référence (bureau + mobile, premier écran + page entière) |
| [`docs/dom/`](./docs/dom/) | Mesures DOM relevées sur le site d’origine |
| [`assets/client-images/`](./assets/client-images/) | Images du client à utiliser exclusivement |
| `site/` | C’est **là** que l’agent construit le projet Vite |
| `verification/` | Journal, score, diffs, rapports de l’agent |
| [`tools/evaluate.mjs`](./tools/evaluate.mjs) | Juge officiel : score /100 et code de sortie du prédicat |
| [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) | Build, évaluation (non bloquante) et déploiement Cloudflare Pages |

Le nom du projet Cloudflare Pages est configurable : variable de dépôt `CF_PAGES_PROJECT` (défaut `full-motion-benchmark`). La `base` Vite est lue depuis `VITE_BASE` / `BASE_PATH` et vaut `/` par défaut (pas de sous-chemin sur Cloudflare Pages).

## Pour l’ami qui lance un modèle

Prérequis : le propriétaire du dépôt t’a ajouté comme **collaborateur** (droit de push). Un simple fork ne suffit pas : les secrets Cloudflare ne sont pas disponibles sur les forks, donc la CI ne pourra pas déployer.

1. Clone le dépôt et crée une branche à ton nom de modèle (un run = une branche) :

   ```bash
   git clone https://github.com/G33KM44N38/full-motion-benchmark.git
   cd full-motion-benchmark
   git checkout -b run/claude-opus   # ou run/codex, run/claude-code, etc.
   ```

2. Ouvre le dépôt avec l’agent, puis soit tu colles le contenu de `PROMPT.md`, soit tu lui dis :

   > Lis `PROMPT.md` et exécute-le.

3. L’agent doit travailler dans `site/` (projet Vite, HTML / CSS / JS vanilla) et s’évaluer **tout seul** avec `cd tools && npm install && npx playwright install chromium && npm run evaluate`. Il décide qu’il a fini uniquement quand le prédicat de `PROMPT.md` est vrai (toutes les cases OK, score ≥ 85, pas d’écart structurel). Les preuves vont dans `verification/` (journal `decision-log.md`, `score.json`, diffs, `REPORT.md`). Ne pas modifier le prompt, `tools/`, les captures de référence, les images client, ni le workflow.

4. Quand c’est terminé, commit **tout** (le site, `vite.config` avec la `base` configurable, la checklist, le rapport, les captures) et pousse la branche :

   ```bash
   git add site/ verification/
   git commit -m "run: claude-opus"
   git push -u origin run/claude-opus
   ```

5. La GitHub Action se lance toute seule : elle reconstruit le site, relance `tools/evaluate` (sans bloquer le déploiement si le score est sous le seuil) et publie le site. Dans l’onglet **Actions**, le résumé du job affiche l’URL **et le score**. Un commentaire est aussi ajouté sur le commit. L’URL stable de la branche ressemble à :

   `https://run-claude-opus.full-motion-benchmark.pages.dev`

   (les `/` du nom de branche sont remplacés par des `-`).

## Comment l’agent s’évalue

Le prompt (`PROMPT.md`, section 4) est un run autonome façon poteto : l’agent fige un **prédicat de sortie** vérifiable, boucle (plus petit changement → `npm run evaluate` → commit si ça avance, sinon revert), tient un journal append-only, et s’arrête seulement quand le prédicat est vrai — ou devant une impasse réellement documentée. Un plateau n’est pas un arrêt.

```bash
cd tools
npm install
npx playwright install chromium
npm run evaluate   # code 0 uniquement si le prédicat est vrai
```

Le score /100 de `verification/score.json` couvre la partie automatisable de la grille ci-dessous (les images du client étant différentes, le diff pixel masque les médias et s’appuie aussi sur les boîtes DOM de `docs/dom/`).

## Réglages à faire une fois (propriétaire du dépôt)

1. Crée un jeton API Cloudflare avec la permission **Cloudflare Pages: Edit** (et l’accès au compte qui héberge le projet).
2. Dans le dépôt GitHub : **Settings → Secrets and variables → Actions**, ajoute :
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. Optionnel : crée le projet Pages à l’avance :

   ```bash
   wrangler pages project create full-motion-benchmark --production-branch=main
   ```

   Sinon, le workflow le crée tout seul au premier déploiement (et ignore l’erreur s’il existe déjà).
4. Optionnel : variable de dépôt `CF_PAGES_PROJECT` si tu veux un autre nom de projet que `full-motion-benchmark`.
5. Ajoute ton ami comme **collaborateur** (**Settings → Collaborators**), pour qu’il pousse directement sur ce dépôt. Les Actions doivent pouvoir tourner (elles sont en général déjà actives sur un dépôt neuf).

Aucun réglage GitHub Pages n’est nécessaire.

## Grille de notation (/100)

Remplie par l’évaluateur, pas par le modèle. Détail et pénalités dans [`PROMPT.md`](./PROMPT.md) § 6.

| Critère | Points |
|---|---|
| Fidélité de structure | 35 |
| Fidélité visuelle | 25 |
| Responsive (390 px) | 15 |
| Intégration des images | 10 |
| Animations et survols | 5 |
| Rigueur de vérification | 7 |
| Qualité du code | 3 |

Pénalités : −10 par section P1 manquante ou réordonnée ; −15 si un asset ou un texte de full-motion.fr est repris tel quel ; −5 si la checklist déclare OK un point visiblement KO.

## Résultats

La liste à jour est générée automatiquement après chaque run réussi (`runs.json` + `index.html` sur la branche `results`), avec le score d’auto-évaluation et l’état du prédicat.

| Modèle | Branche | Date | Lien |
|---|---|---|---|
| *Les cartes apparaîtront sur l’index après le premier déploiement.* | | | |
