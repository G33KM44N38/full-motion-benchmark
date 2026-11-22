# PROMPT BENCHMARK : reproduire le DESIGN de full-motion.fr avec les images du client

> Prompt identique pour chaque modèle. Ne rien modifier entre deux runs, sauf la ligne `MODELE =` ci-dessous.
> MODELE = <nom du modèle / agent>

## 1. Rôle et objectif

Tu es intégrateur front-end senior, spécialisé dans la reproduction au pixel près. Ta mission : reproduire **le design et la structure** du site https://full-motion.fr/ (accueil, univers Drone, univers Rental), en utilisant **exclusivement les images du client** situées dans `assets/client-images/` (à la racine de ce dépôt).

On évalue la **fidélité visuelle**, pas les fonctionnalités. Le résultat doit donner l'impression d'être le même site, habillé avec les images du client.

## 2. Règles absolues (par ordre de priorité)

1. **La fidélité de structure prime sur tout le reste.** Ordre des sections, layout de chaque section (nombre de colonnes, largeurs, proportions, alignements), header, footer, hauteurs relatives. **Toute créativité est interdite** : n'ajoute aucune section, ne réordonne rien, ne « modernise » rien. En cas de doute, la capture de référence fait foi, pas ton goût.
2. **Fidélité visuelle ensuite** : couleurs, typographie, espacements, rayons, ombres, traitement des images, animations et survols, comportement responsive (breakpoint 760 px).
3. **Pas de fonctionnalités réelles.** Pas de back-end, CMS, formulaire fonctionnel, recherche, panier, i18n ni lecteur YouTube. Les éléments interactifs sont des **stubs visuels** : un bouton qui a le bon look, un champ de recherche inerte, un sélecteur FR/EN purement visuel, un hero vidéo remplacé par une image (ou une vidéo locale du dossier client s'il y en a). Seules exceptions, parce qu'elles font partie du design : le loader d'entrée, le coverflow animé de l'accueil, le carrousel Rental, les effets de survol et le header qui change au scroll.
4. **Aucun asset de full-motion.fr dans le livrable** : ni hotlink, ni image, ni logo, ni texte copié tel quel. Remplace le logo par un logo texte du client au même gabarit (mot 1 en script orange + mot 2 en sans-serif gras blanc), et les textes par des placeholders crédibles et de même longueur, ou par le contenu client s'il est fourni dans le dossier. Tu reproduis **la mise en page, pas le contenu**.
5. **Stack imposée** (la même pour tous les modèles) : **HTML + CSS + JavaScript vanilla, servi par Vite** (`npm create vite@latest . -- --template vanilla` lancé **depuis le dossier `site/`**). Dans `vite.config.js` (ou `vite.config.mjs`), impose `base: process.env.VITE_BASE || process.env.BASE_PATH || '/'` pour que le build CI (base `/` par défaut) et un éventuel sous-chemin restent configurables. Ne code pas une base en dur. Pas de framework UI, pas de Tailwind, pas de librairie de composants. Une seule page HTML par gabarit : `index.html`, `drone.html`, `drone-equipment.html`, `drone-team.html`, `drone-contact.html`, `drone-film.html`, `rental.html`, `rental-product.html`, `rental-sales.html`, `rental-delivery.html`, `rental-contact.html`. Les images du client sont **copiées** dans `public/images/` (optimisées en WebP si utile, mais l'original est conservé).
6. Police : la pile système `-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif`. Aucune webfont.
7. Dossier de travail du site : `site/` (à la racine de ce dépôt). Initialise et construis le projet Vite uniquement dedans. Ne modifie pas `PROMPT.md`, `reference/`, `assets/`, `docs/`, `tools/`, `.github/`. Place les rapports et preuves dans `verification/` (à la racine du dépôt).

## 3. Spécification structurelle de référence (checklist)

Chaque ID ci-dessous est un point de contrôle noté OK/KO dans ton rapport final. Priorité : **P1** = Accueil (H0–H5), Drone Work (D1–D4), Rental (R1–R5). **P2** = sous-pages DE, DT, DC, DF, RP, RS, RD, RC. Livre tout P1 parfaitement avant d'attaquer P2.


> Relevé fait sur le site en ligne : HTML (curl), CSS, DOM rendu (Playwright/Chrome) et captures 1440 px et 390 px.
> Site **codé à la main** (HTML/CSS/JS statiques, sans WordPress ni framework) : `index.html`, `drone.html`, `rental.html`. Le contenu des pages Drone et Rental est **injecté en JS** (pages vides sans JS). Les sous-pages passent par des paramètres d'URL (`?page=`, `?item=`, `?film=`, `?categoryId=`).
> Le sitemap compte 1 accueil, 270 URL Drone (films/catégories) et 484 URL Rental (produits) : ce sont **3 gabarits** déclinés.

### 3.0 Design system global

| Token | Valeur relevée |
|---|---|
| Police | Pile système : `-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif` (aucune webfont) |
| Logo | Image : « Full » en script/italique **orange** + « Motion » en sans-serif gras **blanc** |
| Thème sombre (Accueil + Drone) | `--bg #101011` (accueil `#080808`, fond Drone `#050505`), `--surface #1c1c1e`, cartes `#17191c`, `--ink #f5f5f7`, `--muted #a1a1a6`, `--line #ffffff14`, accent `--orange #ff784f` (anneau du loader `#ff8b32`) |
| Thème clair (Rental) | `--bg #fff`, `--surface #f5f5f7`, `--ink #202024`, `--muted #65656d`, accent `#c7441e`, `--line #20202414`. **Le header reste noir** (`#101011`) sur Rental |
| Rayons | Cartes 16–20 px, boutons « pill » 999 px, médias 12–16 px |
| Tailles de texte | Nav 14 px ; sélecteur de langue 11–12 px / 600 ; noms de l'équipe 19 px / 500 ; titres de page Rental ~28–32 px en MAJUSCULES ; corps 14–16 px ; libellés de section en petites majuscules espacées |
| Conteneur | `max-width 1440px`, marges latérales **48 px** (desktop), 16–22 px (mobile) |
| Breakpoint principal | **760 px** (`max-width:760px` = mobile) ; secondaires 620/900/1100 px |
| Animations | Loader d'entrée plein écran noir (emblème drone blanc, hélices animées, anneau de progression orange). Survol carte projet : image `scale(1.035)` et légende qui monte en fondu. Survol entrée accueil : art `scale(1.025)`. Coverflow d'affiches animé. Header en transition de fond. Respect de `prefers-reduced-motion` |
| Langue | Sélecteur FR/EN en pastille (drapeaux) en haut à droite, partout |

### 3.1 ACCUEIL `/` (H ≈ 907 px desktop : tout tient dans un écran, sans scroll)

| ID | Section | Structure / layout (1440 px) | Mobile (390 px) |
|---|---|---|---|
| H0 | Loader d'entrée | Overlay fixe noir plein écran, emblème centré 240×240 px, anneau SVG orange qui se remplit, fondu de sortie 0,45 s | Identique |
| H1 | Barre de marque | **Pas de vraie nav.** Logo **centré** (150×31 px) à y≈18 px ; sélecteur FR/EN en pastille **absolu à droite** | Logo à gauche, sélecteur à droite |
| H2 | Deux entrées | Grille **2 colonnes de 428 px** (gap 24 px), centrée (bloc de 880 px), cartes 428×320 px, fond `#17191c`, bordure 1 px `#ffffff16`, rayon 20 px. Contenu centré : pictogramme blanc (drone / caméra sur trépied), puis H2 « Drone » / « Rental » (~22 px), puis sous-titre muted 12 px | Toujours 2 colonnes côte à côte (cartes plus petites), **ordre inversé : Rental à gauche, Drone à droite** |
| H3 | Coverflow d'affiches | Bande de 880×306 px sous les cartes : affiches portrait en **coverflow 3D**, affiche centrale grande (≈216×296 px) et nette, voisines plus petites et pivotées/assombries de chaque côté, rotation auto | Coverflow centré, plus compact |
| H4 | Footer contacts | Ligne fine en haut, **2 colonnes** séparées par un filet vertical : téléphone (blanc ~14 px), e-mail (muted), icône Instagram en dégradé. Colonne gauche = Drone, droite = Rental | 2 colonnes conservées, ordre inversé comme H2 (Rental à gauche) |
| H5 | Copyright | « © … » très petit, muted, aligné à gauche sous un filet | Idem |

Fond général : quasi noir avec une **texture discrète** (motif sombre façon carbone visible sur les captures).

### 3.2 DRONE – Work `drone.html` (page longue, H ≈ 20 900 px)

| ID | Section | Structure / layout | Mobile |
|---|---|---|---|
| D1 | Header | **Fixe**, 90 px, **transparent** au-dessus du hero (dégradé `#0008` → transparent), devient `#050505e8` + flou au scroll. À gauche : logo (≈190 px) + petit bouton pastille « ⇄ Rental → » (bascule vers l'autre site). À droite : liens Equipment, Team, puis **Contact en pastille bordée**, puis sélecteur FR/EN | Header statique : logo + langue sur la 1re ligne, liens (Work, Equipment, Team, Contact en pastille) sur une 2e ligne |
| D2 | Hero cinéma | Section 1440×≈837 px, **fond vidéo plein écran fixe** (iframe YouTube en cover sur une image), dégradé d'assombrissement vers le noir en bas. Centré en bas : « Discover our projects » + flèche ↓ ; en bas à droite : bouton pastille « ⛶ Watch showreel » | **Pas de hero vidéo** : à la place, barre de recherche arrondie + bouton « Filters » repliable |
| D3 | Grille de projets | **3 colonnes** (`repeat(3,1fr)`, gap 28 px × 20 px), cartes 16:7,3 (`aspect-ratio 24/11`), rayon 16 px, image cover (affiche/visuel avec titre incrusté). La 1re rangée **chevauche le bas du hero**. Survol : zoom de l'image + légende (titre, réalisateur, chef op) qui apparaît. ~260 cartes | **1 colonne**, cartes pleine largeur 358×164 |
| D4 | Footer Drone | Filet en haut ; 3 zones : « Full Motion / Aerial » (gauche), « Contact » + e-mail (milieu), icône Instagram (droite). Puis filet et « © » | Empilé |

#### Sous-pages Drone (même header D1 en mode opaque/sticky, même footer D4)
| ID | Page | Structure |
|---|---|---|
| DE | `?page=equipment` | Colonne centrée de **1060 px**. Petit libellé de section en capitales espacées (« DRONES / CAMERA CAR »). Puis articles en **grille 2 colonnes ≈ 40/60** (image arrondie 431 px à gauche, nom en capitales + specs en liste muted + bouton pastille « Watch demo » à droite), séparés par des filets |
| DT | `?page=team` | Grille **4 colonnes** (318 px, gap 24 px) : photo **carrée** arrondie, nom 19 px/500, rôle 14 px muted. 2 rangées |
| DC | `?page=contact` | Pastille orange avec l'e-mail + icône Instagram ; puis **3 cartes** sombres en ligne (nom, rôle, téléphone) |
| DF | `?film=<slug>` | « ← All work » ; libellé de catégorie orange en petites capitales ; titre H1 ; lecteur vidéo 16:9 arrondi pleine largeur du conteneur ; lien « ▶ Open video · YouTube » |
| DK | `?categoryId=` | Même grille D3, filtrée |

### 3.3 RENTAL – `rental.html` (thème clair)

| ID | Section | Structure / layout | Mobile |
|---|---|---|---|
| R1 | Header | **Sticky**, 88 px, **fond noir** `#101011` même en thème clair. Logo + pastille « ⇄ Drone → » ; à droite : Rental (actif), Delivery, Sales, **Contact**, sélecteur FR/EN | 2 lignes comme D1 |
| R2 | Recherche | Champ arrondi 620×52 px, fond `#f7f7f9`, loupe à gauche, placeholder « Search equipment… » | Pleine largeur |
| R3 | Barre de catégories | Rangée : icône maison, puis menus déroulants à chevron (Cameras, Lenses, Accessories, Grip & Motion, Lighting, Audio) + lien simple Vehicles ; filet en dessous | Maison + un seul bouton déroulant « ☰ Menu » |
| R4 | Carrousel « featured » | Grande carte 1344×432 px, fond `#f5f5f7`, rayon ~20 px : **titre produit en grandes capitales à gauche** (~36 px) + bouton pastille contour « View equipment » ; **photo produit détourée à droite**. Sous la carte : points de pagination à gauche (le point actif est un trait allongé), boutons ronds ← ‖ → à droite. Défilement automatique | Carte empilée (image au-dessus, titre et bouton dessous) |
| R5 | Footer Rental | Filet ; **4 colonnes** : Address / Contact (tél. + e-mail) / Opening hours / « Rental terms » + Instagram (aligné à droite). Filet puis « © » | Grille 2×2 |

#### Sous-pages Rental (mêmes R1, R2, R3, R5 ; flèche ← ajoutée devant la maison en R3)
| ID | Page | Structure |
|---|---|---|
| RP | `?item=<produit>` | Fil d'Ariane « ← Catégorie » ; **H1 en capitales** ; grande carte grise arrondie : en-tête (sous-titre) séparé par un filet, puis **2 colonnes** : photo produit détourée (gauche), titre du kit et prix + liste à puces (droite) |
| RS | `?item=vente` (Sales) | « ← Rental », H1 « SALES », carte grise contenant une liste de lignes fines séparées par des filets |
| RD | `?item=livraison` | H1 « DELIVERY », carte grise : en-tête + filet + paragraphe |
| RC | `?item=contact` | H1 « CONTACT », **3 cartes grises** en ligne : Email / Phone / Address |

### 3.4 Non observé / limites
- Contenu Drone et Rental rendu en JS : la structure vient du DOM rendu, pas du HTML source.
- Le hero vidéo YouTube (D2) et le coverflow changent dans le temps : les captures montrent un seul état.
- États des menus déroulants R3, filtres mobiles, menus et survols : vus dans le CSS, non capturés.
- Le site comporte un mode d'édition caché (`/edit`, scripts `secret-edit`) : hors périmètre.


## 4. Process obligatoire (run autonome, style poteto)

Tu possèdes la condition de sortie. Tu la définis, puis tu avances jusqu'à elle **sans t'arrêter et sans demander à un humain**. Pas de question, pas d'attente d'avis, pas de « est-ce que je continue ? ».

`tools/`, `reference/`, `docs/` et `.github/` sont **en lecture seule**. Il est interdit de les modifier, de contourner `tools/evaluate.mjs`, de baisser le seuil, ou de retoucher une capture de référence pour « passer ».

### 4.1 Avant la première itération : figer le prédicat de sortie

Écris le prédicat dans `verification/decision-log.md` (en tête de fichier) **avant** de modifier `site/`. Il doit être vérifiable par une commande, pas par une impression. Le prédicat officiel, à copier tel quel sauf si tu le rends *plus* strict (jamais moins) :

> Toutes les cases de la checklist (P1 : H0–H5, D1–D4, R1–R5 et P2 : DE, DT, DC, DF, RP, RS, RD, RC) sont OK aux deux viewports 1440×900 et 390×844, **et** `npm run evaluate` (dans `tools/`) se termine avec le code 0, **et** le score global de `verification/score.json` est ≥ 85, **et** aucun écart structurel (section manquante, réordonnée, ou nombre de colonnes faux).

Le juge officiel est `tools/evaluate.mjs`. Il construit ou sert `site/`, capture chaque page aux deux viewports, compare aux JPEG de `reference/` (diff pixel après redimensionnement, zones médias masquées — le diff brut sera élevé à cause des images client) et aux mesures de `docs/dom/`, puis écrit `verification/score.json` et les diffs dans `verification/diffs/`. Code de sortie 0 **uniquement** si le prédicat est vrai.

Installer et lancer (depuis `tools/`) :

```bash
npm install
npx playwright install chromium
npm run evaluate
```

### 4.2 Étape 0 — lire le kit (avant d'écrire la moindre ligne du site)

Le dépôt fournit déjà le kit officiel : captures dans `reference/` (JPEG, viewports 1440×900 et 390×844, premier écran + pleine page), spec dans `docs/structure-full-motion.md`, mesures DOM dans `docs/dom/`. Tu dois **ouvrir et regarder** chaque capture, et écrire `verification/STRUCTURE.md` (liste ordonnée des sections et mesures, confrontée à la section 3). Recapturer https://full-motion.fr/ reste possible pour détecter une dérive : dans ce cas, **la capture du jour fait foi**, mais tu ne remplaces pas `reference/` (lis-seulement).

### 4.3 Étape 1 — inventaire des images et mapping

1. Liste tout `assets/client-images/` (récursivement), avec pour chaque fichier : nom, format, dimensions, orientation (portrait, paysage, carré), poids. Regarde chaque image.
2. Produis `verification/IMAGE-MAP.md`, un tableau `image → ID de section → rôle` (ex. `hero.jpg → D2 fond du hero`, `portrait-01.jpg → DT carte 1`, `affiche-03.jpg → H3 coverflow`). Respecte les **ratios** des emplacements : affiches portrait pour H3, visuels larges 24/11 pour D3, carrés pour DT, produits détourés sur fond clair pour R4/RP. Recadre avec `object-fit: cover` et `object-position` plutôt que de déformer.
3. S'il n'y a pas assez d'images pour une grille, réutilise-les en rotation. Ne réduis jamais le nombre de cartes ou de colonnes, et signale-le dans le journal.

### 4.4 Étape 2 — construction

1. Commence par `src/tokens.css` (variables de la section 3.0 : thème sombre, thème clair Rental, rayons, conteneur 1440/48 px, breakpoint 760 px), puis les composants partagés (header D1/R1, footers H4/D4/R5, pastilles, sélecteur de langue), puis les pages P1 et enfin P2.
2. Desktop et mobile ensemble : chaque section a sa variante ≤ 760 px **telle que décrite**. Les variantes mobiles changent l'ordre ou la structure : inversion Rental/Drone sur l'accueil, header sur 2 lignes, pas de hero vidéo en mobile sur Drone mais recherche + Filters, menu Rental réduit à « Menu ».
3. Les animations listées (loader, coverflow, carrousel, survols, header au scroll) sont reproduites, avec un fallback `prefers-reduced-motion`.
4. Construis **section par section dans l'ordre de la checklist**. Chaque unité est une expérience que tu vérifies avant de passer à la suivante, au lieu de tout tester à la fin.

### 4.5 Boucle : le plus petit changement justifié par la preuve

À chaque itération, dans cet ordre :

1. Fais le **plus petit changement** que la preuve justifie (une section, un espacement, un point de grille — pas un refactor « au cas où »).
2. Lance `npm run evaluate` dans `tools/`. Lis `verification/score.json` et les diffs / montages côte à côte. Le verdict vient de l'artefact, pas d'une auto-déclaration.
3. Si le prédicat a avancé (score en hausse, ou une case KO devenue OK, sans régression ailleurs) : **commit** le changement.
4. Si ça n'a pas aidé : **revert** (y compris les « ça pourrait aider »). Ne laisse pas un changement inutile dans l'arbre.
5. Ajoute **une ligne** à `verification/decision-log.md` (journal append-only : on n'efface et on ne réécrit jamais une ligne déjà écrite). Colonnes : `ts` (ISO 8601), `itération`, `décision` (ce qui a changé), `pourquoi`, `preuve` (chemin vers un diff, un montage, un SHA de commit — un pointeur, pas un paragraphe), `score avant → après`, `résultat` (`conservé`, `revert`, état du prédicat).

Un plateau n'est pas un arrêt : change d'approche (autre découpage, autre façon de poser la grille, reprise d'une section depuis la capture de référence) et continue. N'abaisse jamais le prédicat pour déclarer victoire.

### 4.6 Quand s'arrêter

Arrête-toi seulement quand :

- le prédicat est **vrai** (evaluate code 0), ou
- tu documentes une **impasse réelle** dans le journal et dans `verification/REPORT.md` : ce qui bloque, les approches déjà tentées, pourquoi la prochaine expérience n'a plus de levier. Une impasse n'est pas « je n'ai plus d'idée au bout de cinq essais ».

### 4.7 Passe de relecture finale

Avant de rendre le travail :

1. Relis le journal : chaque ligne doit correspondre à une vraie décision, et chaque preuve doit exister et montrer ce que la ligne affirme. Un oubli se corrige par **une nouvelle ligne** qui reprend les faits, jamais en éditant l'historique.
2. Si tu peux lancer un sous-agent d'un **autre modèle** (autre fournisseur que celui qui a fait le travail), fais-le relire le journal et les captures / diffs. Ce n'est pas un second chantier : il signale preuves faibles, vérifications sautées, choix risqués. Consigne le résultat en fin de `verification/REPORT.md` (« Relu par <modèle> », puis les alertes ou « aucune alerte »). Si tu ne peux pas, fais cette relecture toi-même et dis-le clairement.

### 4.8 Rapport final

Écris `verification/REPORT.md` avec au minimum :

- le prédicat de sortie (tel que figé au départ) ;
- le nombre d'itérations, ce qui a été conservé, ce qui a été revert ;
- l'état final du prédicat (vrai / faux, score, cases encore KO, écarts structurels) ;
- des pointeurs vers les montages côte à côte (`verification/evidence/side-by-side/`) et les diffs (`verification/diffs/`) ;
- les images manquantes ou réutilisées, et ce qui n'a pas pu être vérifié (notamment les animations, partiellement heuristiques dans evaluate).

## 5. Livrables

- Le projet Vite complet **dans `site/`**, lancé par `npm install && npm run dev`, plus `npm run build` qui passe sans erreur (la `base` Vite est lue depuis `VITE_BASE` / `BASE_PATH`, défaut `/`).
- `verification/STRUCTURE.md` (étape 0), `verification/IMAGE-MAP.md` (étape 1).
- `verification/decision-log.md` (prédicat figé + une ligne par itération).
- `verification/score.json`, `verification/diffs/`, `verification/evidence/build/`, `verification/evidence/side-by-side/` (produits par `tools/evaluate`).
- `verification/CHECKLIST.md` : tableau `ID | Page | Desktop OK/KO | Mobile OK/KO | % diff pixel masqué | Remarque`, aligné sur `score.json` (pas de OK sans preuve).
- `verification/REPORT.md` : voir 4.8.

## 6. Grille de notation (/100)

`tools/evaluate` calcule un score aligné sur cette grille pour tout ce qui est automatisable (structure, visuel masqué, responsive, images, plus des heuristiques pour les animations, la présence du journal, et le code). C'est ce score, et lui seul, qui décide du prédicat de sortie. L'évaluateur humain peut ensuite ajuster les critères non automatisables, sans que le modèle y touche.

| Critère | Points | Comment noter |
|---|---|---|
| Fidélité de structure | **35** | Ordre des sections, colonnes, proportions, header, footer, page par page (checklist P1 = 25, P2 = 10) |
| Fidélité visuelle | **25** | Couleurs, typographie, espacements, rayons, thème sombre/clair, logo au bon gabarit |
| Responsive (390 px) | **15** | Variantes mobiles conformes : inversions, header sur 2 lignes, grilles à 1 colonne, menu Rental |
| Intégration des images | **10** | Mapping pertinent, ratios respectés, aucune déformation, aucun asset full-motion |
| Animations et survols | **5** | Loader, coverflow, carrousel, survols, header au scroll |
| Rigueur de vérification | **7** | Captures et diffs réellement produits, checklist honnête (KO assumés), skill exécuté |
| Qualité du code | **3** | Tokens CSS, composants partagés, build propre |

Pénalités : −10 par section P1 manquante ou réordonnée ; −15 en cas d'asset ou de texte de full-motion.fr repris tel quel ; −5 si la checklist déclare OK un point visiblement KO.
