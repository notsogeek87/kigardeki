# Audit UX — lien de partage (public senior, ~60 ans)

Cible : grands-parents et proches qui ouvrent le lien `/share/<token>` reçu par
SMS ou e-mail, le plus souvent sur smartphone. Ils sont peu à l'aise avec
l'informatique, ont souvent besoin de lunettes, et se posent surtout une question :
**« Quand est-ce que je garde les petits ? »**

Légende : 🔴 bloquant · 🟠 important · 🟡 confort · ✅ corrigé dans cette branche

---

## 1. Lisibilité et accessibilité

| # | Constat | Gravité | Proposition | État |
|---|---------|---------|-------------|------|
| 1.1 | `maximumScale: 1` dans le viewport **empêche de zoomer avec deux doigts** (WCAG 1.4.4). C'est le premier réflexe d'une personne qui lit mal. | 🔴 | Supprimer `maximumScale`. | ✅ |
| 1.2 | Texte trop petit : beaucoup de `text-sm` (14 px), `text-xs` (12 px) et des badges à **10 px** (« Aujourd'hui », « Garde nécessaire »). | 🔴 | Page de partage agrandie de 12,5 % (texte courant 18 px) ; badges minimum 12 px × 1,125. | ✅ |
| 1.3 | Contraste insuffisant : gris `slate-400` sur blanc ≈ 2,6:1 (« Rien de prévu », lieu, légende), jours hors mois en `slate-300`. | 🔴 | Textes informatifs en `slate-600`/`700` minimum (≥ 4,5:1). | ✅ |
| 1.4 | Dégradé arc-en-ciel : texte blanc sur jaune `#eab308` ≈ 2:1, encore pire avec `opacity-50`. | 🔴 | Teintes 700 (≥ 4,5:1 sur toute la longueur) ; plus d'opacité réduite, on affiche « ✓ Garde trouvée » en vert. | ✅ (global) |
| 1.5 | Pastilles de couleur de 6 px dans le mois : informations portées **uniquement par la couleur** (daltonisme fréquent chez les hommes de 60 ans+). | 🟠 | Pastilles agrandies + liseré blanc ; le prénom reste toujours écrit en clair dans la vue Jour/Semaine. | ✅ partiel |
| 1.6 | En-têtes du mois « L M M J V S D » : deux « M » ambigus. | 🟡 | « Lun Mar Mer… ». | ✅ |
| 1.7 | `title` (info-bulle au survol) sur les jours du mois : n'existe pas sur téléphone. | 🟡 | Remplacé par un `aria-label` + phrase « Touchez un jour pour voir le détail ». | ✅ |

## 2. Compréhension et vocabulaire

| # | Constat | Gravité | Proposition | État |
|---|---------|---------|-------------|------|
| 2.1 | En-tête « LECTURE SEULE » en petites capitales : jargon, et inquiétant (« ai-je le droit ? »). | 🟠 | « Le planning des enfants, tenu à jour par les parents ». | ✅ |
| 2.2 | Aucune explication sur ce qu'on peut faire. Peur de « casser quelque chose ». | 🟠 | Encart repliable « ❓ Comment utiliser ce planning ? » qui rassure (rien ne peut être modifié) et explique les gestes. | ✅ |
| 2.3 | Lien invalide : « Lien invalide ou révoqué » — « révoqué » est du jargon. | 🟠 | « Ce lien ne fonctionne plus » + quoi faire (« demandez aux parents de vous le renvoyer par SMS »). | ✅ |
| 2.4 | « arc-en-ciel = garde à trouver » : métaphore abstraite. | 🟡 | « Jour en couleurs = il faut encore trouver quelqu'un pour garder. » | ✅ |
| 2.5 | Besoin couvert affiché « Garde nécessaire » en grisé : on ne sait pas si c'est réglé. | 🟠 | « Garde à trouver » (arc-en-ciel) vs « ✓ Garde trouvée » (vert). | ✅ |
| 2.6 | Libellé de semaine « lun 6 — dim 12 » sans le mois. | 🟡 | « Semaine du lundi 6 octobre ». | ✅ |
| 2.7 | Onglet « À garder » : pas évident. | 🟡 | Conservé (terme déjà utilisé côté parents), mais la liste commence maintenant par une phrase d'explication. À tester avec un vrai grand-parent ; alternative : « Besoin d'aide ». | ✅ partiel |

## 3. Navigation et parcours

| # | Constat | Gravité | Proposition | État |
|---|---------|---------|-------------|------|
| 3.1 | **La question n°1 (« mes gardes ») est cachée** derrière une liste déroulante « Toutes les personnes ». Les `<select>` sont mal maîtrisés par ce public. | 🔴 | Bloc « Voir seulement les gardes de : » avec un gros bouton par prénom. Écran dédié « Les prochaines gardes de Mamie » + bouton « ← Revenir au planning complet ». | ✅ |
| 3.2 | Flèches seules « ← » « → » en gris, sans texte : pas reconnues comme boutons. | 🟠 | Vrais boutons « ← Avant » / « Après → », période affichée en gros au-dessus. | ✅ |
| 3.3 | Une fois parti dans le futur/passé, aucun moyen simple de revenir à aujourd'hui. | 🟠 | Bouton « Aujourd'hui » qui apparaît dès qu'on n'est plus sur la période courante. | ✅ |
| 3.4 | Le jour courant n'est signalé que par un mini-badge 10 px. | 🟠 | Journée encadrée et surlignée en bleu dans la semaine ; anneau dans le mois. | ✅ |
| 3.5 | Filtres enfant/personne en `<select>` qui nécessitent JavaScript (`router.push`). | 🟡 | Remplacés par des liens « pastilles » rendus côté serveur : fonctionnent même sur un vieux téléphone lent. Filtre enfant affiché seulement s'il y a plusieurs enfants. | ✅ |
| 3.6 | **« Ajouter à l'écran d'accueil » depuis le lien de partage ouvre… la page de connexion des parents** (le manifeste global démarre sur `/today`). | 🔴 | Manifeste spécifique au lien (`/share/<token>/manifest`) qui rouvre ce planning ; instructions iPhone/Android dans l'aide. | ✅ |
| 3.7 | La page était indexable par les moteurs de recherche. | 🟠 | `noindex, nofollow` (+ `X-Robots-Tag` sur le manifeste). | ✅ |

## 4. Vue « Mois » repensée

La grille du mois était la vue la plus riche mais la moins lisible : des points de
couleur de 6 px, et un jour « à trouver » entièrement recouvert d'arc-en-ciel qui
masquait tout le reste.

| Avant | Après | État |
|-------|-------|------|
| 1 à 3 points de couleur par jour, sans savoir quand | **Chaque case est coupée en deux : matin en haut, après-midi en bas**, peinte de la couleur de la personne qui garde | ✅ |
| Couleur seule (daltonisme) | **Prénom court écrit dans la couleur** (« Papi », « Mami », « Mama » : on raccourcit seulement jusqu'à ce que ce soit sans ambiguïté) | ✅ |
| Jour entier en arc-en-ciel | Seule la **demi-journée manquante** passe en arc-en-ciel avec un « ? » | ✅ |
| École/crèche = même point que les gardes | Gris clair, sans icône : le regard va directement aux couleurs des gardes | ✅ |
| Jours des mois voisins aussi chargés que les autres | Juste un chiffre très pâle | ✅ |
| Jours passés au même niveau | Jours passés estompés ; aujourd'hui = cadre et pastille bleus | ✅ |
| Week-ends non distingués | Fond légèrement grisé, en-têtes Sam/Dim plus clairs | ✅ |
| Légende latérale avec toutes les personnes | Légende sous la grille, **limitée à ce qui apparaît ce mois-ci**, avec un mini-schéma « matin / après-midi » | ✅ |
| `title` au survol (inexistant sur mobile) | Chaque case a une description lue par les lecteurs d'écran (« mardi 14 octobre — matin : Papi ; après-midi : garde à trouver ») | ✅ |

## 5. Côté application parents (hors lien de partage, pour mémoire)

- Le correctif zoom (1.1) et le contraste arc-en-ciel (1.4) s'appliquent à toute l'app.
- Page d'invitation (`/invite/<token>`) : probablement utilisée aussi par des grands-parents.
  Ajouter une case « Afficher le mot de passe » et indiquer la règle (« 8 caractères minimum »)
  *avant* l'erreur.
- Barre du bas : libellés en 12 px ; passer à 13–14 px.
- Liste « Famille » : pour un compte Consultation, les cartes pointent vers `#` mais ont l'air
  cliquables (effet `active:opacity-70`) — retirer le lien quand on ne peut pas éditer.

## Fichiers modifiés

- `src/app/layout.tsx` — zoom réactivé.
- `src/app/globals.css` — agrandissement de la page de partage (`.share-root`).
- `src/components/care-need-display.tsx` — arc-en-ciel contrasté, badges 12 px, `needLabel` paramétrable.
- `src/app/share/[token]/page.tsx` — refonte de la page de partage, dont la grille du mois.
- `src/app/share/[token]/manifest/route.ts` — manifeste propre au lien.
