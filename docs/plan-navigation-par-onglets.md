# Plan — Navigation par onglets et page d’accueil

**Statut** : proposition à valider, aucune modification fonctionnelle commencée.  
**Branche** : `feat/deficit-dette-historique`

## Objectif

Remplacer le long défilement de la page actuelle par une entrée synthétique et des espaces de lecture distincts. Depuis l’accueil, chaque agrégat doit conduire vers la vue qui l’explique. Les pages secondaires doivent garder un retour visible vers l’accueil.

Principe de lecture : **un aperçu → une question → les données détaillées et leur source**.

## Proposition d’organisation

Navigation principale persistante, avec quatre entrées :

1. **Accueil** — quelques agrégats, une phrase d’explication et des liens vers les détails.
2. **Budget de l’État** — crédits CP/AE, principaux domaines, classement, fiche de mission et vue experte.
3. **Solde et dette** — solde historique, solde exécuté récent du budget général, intérêts, encours en valeur et en % du PIB, amortissements et financement.
4. **Mesures et contexte** — repères 43/54 Md€, mesures PLFSS et leurs réserves de périmètre.

La **méthode et les sources** restent accessibles depuis la navigation (ou un lien secondaire permanent), sans être confondues avec les quatre vues de données.

### Contenu envisagé pour l’accueil

Limiter l’accueil à 3–5 repères regroupés par nature et période, par exemple :

- **Projet simulé 2027** : total CP et évolution par rapport à la LFI 2026 → onglet « Budget de l’État ».
- **Exécution observée** : dernier solde exécuté du budget général disponible → « Solde et dette ».
- **Dette observée** : intérêts et principal remboursé, en indiquant clairement l’année et le périmètre de chaque chiffre → « Solde et dette ».
- Un repère 43/54 Md€ ou PLFSS, seulement si l’accueil ne devient pas trop chargé → « Mesures et contexte ».

Ne pas juxtaposer prévisions du PLF simulé et exécutions historiques comme s’il s’agissait d’une série homogène. Chaque carte indique son année, son périmètre, son statut (prévu/exécuté) et sa source. Conserver l’avertissement sur le caractère simulé du PLF 2027.

## Comportement de navigation

- Onglets visibles et persistants sur toutes les vues ; l’onglet actif est identifié par le texte et le style, pas par la couleur seule.
- Chaque vue secondaire affiche aussi un lien explicite **« ← Accueil »**.
- Utiliser des liens de navigation HTML avec une apparence d’onglets et `aria-current="page"`, plutôt qu’un `tablist` ARIA qui imposerait le comportement clavier spécifique de vrais onglets applicatifs.
- Chaque vue possède une URL partageable (`?vue=accueil`, `?vue=budget`, `?vue=dette`, `?vue=contexte`). Préserver le retour navigateur et permettre le lien direct.
- Conserver la fiche mission dans l’URL et son retour vers la liste de missions. Les filtres CP/AE et la recherche restent propres à la vue Budget ; revenir sur cette vue ne devrait pas les réinitialiser sans raison.
- Préserver le lien méthodologie existant `/?page=methodologie` pour ne pas casser les favoris et liens déjà diffusés.

## Changements de structure prévus

1. Introduire un routeur léger dans `App.tsx` basé sur `URLSearchParams`, `history.pushState` et `popstate` ; aucune dépendance externe n’est requise.
2. Extraire les vues actuellement réunies dans `Dashboard` / `BudgetContext` afin que le contenu du budget, le contexte PLFSS et la dette puissent être rendus indépendamment.
3. Créer la page d’accueil et ses cartes réutilisables, en s’appuyant sur les données déjà curatées.
4. Ajouter navigation persistante, état actif, liens de retour et compatibilité des URL existantes.
5. Mettre à jour le glossaire, la méthodologie, le protocole de validation et les captures/procédures de test.

Le pipeline de données et les calculs budgétaires ne doivent pas changer dans cette tranche ; il s’agit d’abord de réorganiser leur présentation.

## Tests et critères d’acceptation

- À l’ouverture sans paramètre, l’accueil apparaît et expose les agrégats avec leurs sources, années, périmètres et statuts.
- Chaque carte de l’accueil conduit à l’onglet correspondant ; chaque page secondaire permet de revenir à l’accueil.
- Les URL directes ouvrent la bonne vue ; actualisation et boutons précédent/suivant conservent la vue et, pour une mission, son identifiant.
- Le lien historique `/?page=methodologie` fonctionne toujours sans initialiser DuckDB.
- CP/AE, recherche, fiche de mission, exports, données de dette et mesures PLFSS gardent leurs chiffres et leurs sources inchangés.
- Navigation clavier, indicateur d’onglet actif, focus après navigation, mobile 375 px, zoom 200 % et audit axe-core restent valides.

## Décisions à confirmer avant l’implémentation

1. Valider les quatre vues principales proposées (Accueil, Budget, Solde et dette, Mesures et contexte).
2. Choisir les **3–5 agrégats exacts** de l’accueil et confirmer qu’on y montre ensemble des données de 2027 simulées et les dernières exécutions historiques uniquement dans des blocs explicitement séparés.
3. Garder la méthodologie comme lien secondaire, plutôt que comme cinquième onglet principal.
