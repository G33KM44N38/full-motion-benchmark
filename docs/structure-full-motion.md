# Spec structurelle & design de https://full-motion.fr/ (relevé du 22/11/2026)

> Relevé fait sur le site en ligne : HTML (curl), CSS, DOM rendu (Playwright/Chrome) et captures 1440 px et 390 px.
> Site **codé à la main** (HTML/CSS/JS statiques, sans WordPress ni framework) : `index.html`, `drone.html`, `rental.html`. Le contenu des pages Drone et Rental est **injecté en JS** (pages vides sans JS). Les sous-pages passent par des paramètres d'URL (`?page=`, `?item=`, `?film=`, `?categoryId=`).
> Le sitemap compte 1 accueil, 270 URL Drone (films/catégories) et 484 URL Rental (produits) : ce sont **3 gabarits** déclinés.

## 0. Design system global

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

## 1. ACCUEIL `/` (H ≈ 907 px desktop : tout tient dans un écran, sans scroll)

| ID | Section | Structure / layout (1440 px) | Mobile (390 px) |
|---|---|---|---|
| H0 | Loader d'entrée | Overlay fixe noir plein écran, emblème centré 240×240 px, anneau SVG orange qui se remplit, fondu de sortie 0,45 s | Identique |
| H1 | Barre de marque | **Pas de vraie nav.** Logo **centré** (150×31 px) à y≈18 px ; sélecteur FR/EN en pastille **absolu à droite** | Logo à gauche, sélecteur à droite |
| H2 | Deux entrées | Grille **2 colonnes de 428 px** (gap 24 px), centrée (bloc de 880 px), cartes 428×320 px, fond `#17191c`, bordure 1 px `#ffffff16`, rayon 20 px. Contenu centré : pictogramme blanc (drone / caméra sur trépied), puis H2 « Drone » / « Rental » (~22 px), puis sous-titre muted 12 px | Toujours 2 colonnes côte à côte (cartes plus petites), **ordre inversé : Rental à gauche, Drone à droite** |
| H3 | Coverflow d'affiches | Bande de 880×306 px sous les cartes : affiches portrait en **coverflow 3D**, affiche centrale grande (≈216×296 px) et nette, voisines plus petites et pivotées/assombries de chaque côté, rotation auto | Coverflow centré, plus compact |
| H4 | Footer contacts | Ligne fine en haut, **2 colonnes** séparées par un filet vertical : téléphone (blanc ~14 px), e-mail (muted), icône Instagram en dégradé. Colonne gauche = Drone, droite = Rental | 2 colonnes conservées, ordre inversé comme H2 (Rental à gauche) |
| H5 | Copyright | « © … » très petit, muted, aligné à gauche sous un filet | Idem |

Fond général : quasi noir avec une **texture discrète** (motif sombre façon carbone visible sur les captures).

## 2. DRONE – Work `drone.html` (page longue, H ≈ 20 900 px)

| ID | Section | Structure / layout | Mobile |
|---|---|---|---|
| D1 | Header | **Fixe**, 90 px, **transparent** au-dessus du hero (dégradé `#0008` → transparent), devient `#050505e8` + flou au scroll. À gauche : logo (≈190 px) + petit bouton pastille « ⇄ Rental → » (bascule vers l'autre site). À droite : liens Equipment, Team, puis **Contact en pastille bordée**, puis sélecteur FR/EN | Header statique : logo + langue sur la 1re ligne, liens (Work, Equipment, Team, Contact en pastille) sur une 2e ligne |
| D2 | Hero cinéma | Section 1440×≈837 px, **fond vidéo plein écran fixe** (iframe YouTube en cover sur une image), dégradé d'assombrissement vers le noir en bas. Centré en bas : « Discover our projects » + flèche ↓ ; en bas à droite : bouton pastille « ⛶ Watch showreel » | **Pas de hero vidéo** : à la place, barre de recherche arrondie + bouton « Filters » repliable |
| D3 | Grille de projets | **3 colonnes** (`repeat(3,1fr)`, gap 28 px × 20 px), cartes 16:7,3 (`aspect-ratio 24/11`), rayon 16 px, image cover (affiche/visuel avec titre incrusté). La 1re rangée **chevauche le bas du hero**. Survol : zoom de l'image + légende (titre, réalisateur, chef op) qui apparaît. ~260 cartes | **1 colonne**, cartes pleine largeur 358×164 |
| D4 | Footer Drone | Filet en haut ; 3 zones : « Full Motion / Aerial » (gauche), « Contact » + e-mail (milieu), icône Instagram (droite). Puis filet et « © » | Empilé |

### Sous-pages Drone (même header D1 en mode opaque/sticky, même footer D4)
| ID | Page | Structure |
|---|---|---|
| DE | `?page=equipment` | Colonne centrée de **1060 px**. Petit libellé de section en capitales espacées (« DRONES / CAMERA CAR »). Puis articles en **grille 2 colonnes ≈ 40/60** (image arrondie 431 px à gauche, nom en capitales + specs en liste muted + bouton pastille « Watch demo » à droite), séparés par des filets |
| DT | `?page=team` | Grille **4 colonnes** (318 px, gap 24 px) : photo **carrée** arrondie, nom 19 px/500, rôle 14 px muted. 2 rangées |
| DC | `?page=contact` | Pastille orange avec l'e-mail + icône Instagram ; puis **3 cartes** sombres en ligne (nom, rôle, téléphone) |
| DF | `?film=<slug>` | « ← All work » ; libellé de catégorie orange en petites capitales ; titre H1 ; lecteur vidéo 16:9 arrondi pleine largeur du conteneur ; lien « ▶ Open video · YouTube » |
| DK | `?categoryId=` | Même grille D3, filtrée |

## 3. RENTAL – `rental.html` (thème clair)

| ID | Section | Structure / layout | Mobile |
|---|---|---|---|
| R1 | Header | **Sticky**, 88 px, **fond noir** `#101011` même en thème clair. Logo + pastille « ⇄ Drone → » ; à droite : Rental (actif), Delivery, Sales, **Contact**, sélecteur FR/EN | 2 lignes comme D1 |
| R2 | Recherche | Champ arrondi 620×52 px, fond `#f7f7f9`, loupe à gauche, placeholder « Search equipment… » | Pleine largeur |
| R3 | Barre de catégories | Rangée : icône maison, puis menus déroulants à chevron (Cameras, Lenses, Accessories, Grip & Motion, Lighting, Audio) + lien simple Vehicles ; filet en dessous | Maison + un seul bouton déroulant « ☰ Menu » |
| R4 | Carrousel « featured » | Grande carte 1344×432 px, fond `#f5f5f7`, rayon ~20 px : **titre produit en grandes capitales à gauche** (~36 px) + bouton pastille contour « View equipment » ; **photo produit détourée à droite**. Sous la carte : points de pagination à gauche (le point actif est un trait allongé), boutons ronds ← ‖ → à droite. Défilement automatique | Carte empilée (image au-dessus, titre et bouton dessous) |
| R5 | Footer Rental | Filet ; **4 colonnes** : Address / Contact (tél. + e-mail) / Opening hours / « Rental terms » + Instagram (aligné à droite). Filet puis « © » | Grille 2×2 |

### Sous-pages Rental (mêmes R1, R2, R3, R5 ; flèche ← ajoutée devant la maison en R3)
| ID | Page | Structure |
|---|---|---|
| RP | `?item=<produit>` | Fil d'Ariane « ← Catégorie » ; **H1 en capitales** ; grande carte grise arrondie : en-tête (sous-titre) séparé par un filet, puis **2 colonnes** : photo produit détourée (gauche), titre du kit et prix + liste à puces (droite) |
| RS | `?item=vente` (Sales) | « ← Rental », H1 « SALES », carte grise contenant une liste de lignes fines séparées par des filets |
| RD | `?item=livraison` | H1 « DELIVERY », carte grise : en-tête + filet + paragraphe |
| RC | `?item=contact` | H1 « CONTACT », **3 cartes grises** en ligne : Email / Phone / Address |

## 4. Non observé / limites
- Contenu Drone et Rental rendu en JS : la structure vient du DOM rendu, pas du HTML source.
- Le hero vidéo YouTube (D2) et le coverflow changent dans le temps : les captures montrent un seul état.
- États des menus déroulants R3, filtres mobiles, menus et survols : vus dans le CSS, non capturés.
- Le site comporte un mode d'édition caché (`/edit`, scripts `secret-edit`) : hors périmètre.
