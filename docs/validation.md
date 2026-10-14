# Validation — tableau de bord budgétaire citoyen

**Résultat : 111/111 contrôles headless PASS, 11/11 tests de données PASS, 7/7 tests unitaires PASS.** Build TypeScript/Vite réussi et oxlint sans avertissement. Vite signale encore un avertissement connu : `duckdb.ts` est à la fois importé dynamiquement par `App.tsx` et statiquement par les vues. La validation couvre les quatre vues, les URL directes, l’historique navigateur et les séries historiques solde/dette.

Ce rapport remplace les validations historiques (26 puis 38 contrôles) de la vue initiale. Les défauts d’extraction signalés à l’époque sont corrigés, et les KPI utilisent désormais les totaux mission imprimés, pas la somme des programmes extraits.

## Rejouer

```bash
cd sqlrooms-dashboard
npm ci
# Facultatif : récupérer les versions courantes des sources historiques
npm run refresh:finance
npm run prepare:data
npm test
npm run test:data
npm run lint
npm run build:publication
npm run test:headless
# port alternatif si 8901 est occupé :
python3 ../scripts/validate_headless.py --port 8928
```

Prérequis : Python avec `pdfplumber` et `websocket-client`, Chromium, Node 22.18+, les deux PDF locaux du prototype et les sources curatées sous `sources/`. `npm run refresh:finance` rafraîchit AMECO, la série INSEE et le rapport de la Cour des comptes ; le build de publication sert les CSV et les trois PDF sur la même origine.

## Méthode

- **Extraction réelle du PDF** : tests de hiérarchie, libellés, Investir 2030, types, unicité, contrat et réconciliation des quatre colonnes. Valeurs de référence figées indépendamment du calcul UI.
- **Agrégation Python indépendante** : calcul attendu depuis les lignes total mission du CSV, sans SQL ni DuckDB ; comparaison avec les KPI et exports du navigateur.
- **UI réelle** : `dist/` servi en statique ; Chromium avec profil isolé et port CDP libre. Clics, clavier natif via CDP, saisie et navigation.
- **Régression qualité** : injection d’un écart de 1 M€ dans un programme CP 2027 du CSV du build. Le KPI reste égal au total imprimé et la fiche expose l’écart. Les octets du CSV sont restaurés en `finally`. Cache désactivé pour ce scénario.
- **Accessibilité** : axe-core (tags WCAG 2 A/AA, 2.1 AA, 2.2 AA) sur les quatre vues, fiche mission, vue experte, Accueil mobile, Budget mobile et méthodologie ; tests clavier/focus et contraste de toute la palette treemap.

## Références numériques (budget général brut)

| Type | LFI 2026, euros | PLF 2027, euros | Affichage arrondi |
|---|---:|---:|---|
| CP | 593 890 071 649 | 615 139 875 333 | 593,9 → 615,1 Md€, +21,2 Md€, +3,6 % |
| AE | 620 249 232 626 | 632 868 821 128 | 620,2 → 632,9 Md€ |

- 32 missions, 135 programmes/dotations (y compris les lignes sans crédits), 668 faits (32 + 135) × 2 années × 2 types.
- Investir pour la France de 2030 : 3 999 870 000 € CP 2027, total p. 309, cinq programmes p. 309–310. AE 2027 : zéro.
- Les totaux mission et les sommes des programmes sont égaux dans chaque colonne, pour chaque mission. Aucun écart actuel ; mécanisme d’alerte validé par injection.
- Remboursements et dégrèvements : premier poste CP 2027, 144,5 Md€. Inclus dans le dénominateur brut, pas assimilé à des services publics.

## Couverture fonctionnelle

| Domaine | Contrôles validés |
|---|---|
| Entrée | Titre citoyen, avertissement prévision/exécution, caractère simulé annoncé |
| Accueil | Cinq agrégats sourcés et un treemap hiérarchique : 32 missions, programmes en nuances, tableau alternatif de 135 lignes ; note ECU/EUR en bas de page |
| Budget | CP/AE 2026/2027, delta, 32 missions, classement, calcul pour 100 €, recherche, réinitialisation et graphiques masqués par défaut |
| Tableaux | 32 lignes missions, total en pied, tri asc/desc et `aria-sort`, tri Entrée/Espace ; mise en évidence bleue neutre et appel au clic pour le poste dette |
| Fiche mission | Investir 2030 et cinq programmes, total imprimé, part du budget complet, pages 309/310, focus, AE zéro |
| Navigation | Quatre URL directes, onglet actif, focus après navigation, retour/avance navigateur, anciennes URL `#mission`, liens des cartes, navigation mission et retour clavier avec recherche conservée |
| Expert | 32 cellules treemap, 28 barres comparatives, 668 faits bruts, réconciliation explicite |
| Exports | Classement 64 lignes, programmes 10 lignes pour Investir, brut 668, contexte 6 et dérivé marqué, PLFSS 17 sans total |
| Contexte | 43/54 Md€ distincts, année/unité/périmètre/source et réserves de non-additivité |
| Solde et dette | Solde APU AMECO 1974–2024 avec ligne zéro ; solde exécuté du budget général INSEE 2009–2025 ; intérêts APU à partir de 1978 ; encours à partir de 1977 affiché en Md ECU/EUR et en % du PIB sur deux graphiques côte à côte, utilisant la largeur disponible ; amortissements MLT État 2019–2024 et intérêts/charge 2023–2024 ; exports sourcés, périmètres explicités |
| PLFSS | 17 mesures, 278,7 / 5,1 / −12,7 Md€, réserves non-additivité et ventilation non publiée |
| Sources | Trois PDF réellement servis avec type MIME PDF ; sources AMECO, INSEE et AFT liées aux séries historiques |
| Accessibilité | Neuf audits axe-core sans violation détectée (quatre vues, fiche, expert, Accueil mobile, Budget mobile, méthodologie), tabulation, focus visible, mobile 375 px sans débordement, zoom CSS émulé à 200 %, reduced-motion |
| Robustesse | Absence de doublons, synchronisation des CSV, écart injecté visible sans changement des KPI, restauration du build |

## Performance

Les graphiques Recharts sont chargés à la demande ; DuckDB et le dashboard sont séparés du bundle d’entrée. Plus de chunk JS > 500 Ko après découpage. La page méthodologie ne charge pas le WASM. Le dashboard charge encore environ 35 Mo de WASM au premier accès ; ce coût nécessite une mesure sur connexion lente avant une publication à grande audience.

## Sources utilisées

Empreintes SHA-256 des sources archivées :

```text
PLF    132274b83bed4861a9e1a147d0d16abda2d729cdad2373ef804e26747c43d881
PLFSS  71010873c0af8a776436e3c22628d3a1dc048ea406632afa2107dc83be7c598d
AMECO  b460629037dfc994d805b3f236c80feb6c49bc86b3cde3f3cfc32027a08c3005
INSEE  479d3f8e2c3b09e2767862a01e0ed38ad05f478343c409b8e953b8e3cd8304ed
Cour   d2bc38c6b6977a10ce4d4d2690489b101ec54952409265cd9848ae09ab100ada
```

## Réserves et travaux externes

- **Le PLF est fictif / simulé** (ADR-001). Aucun budget officiel réel ne peut être déduit de cette démonstration.
- Les montants du PLF simulé sont des crédits prévus, pas des dépenses exécutées ; euros courants, pas corrigés de l’inflation. Les séries historiques sont distinctes et issues d’AMECO, de l’INSEE et du rapport de la Cour des comptes.
- La série longue disponible porte sur le **solde des administrations publiques**, pas sur le seul budget de l’État ; elle ne suffit donc pas à prouver une affirmation sur le périmètre État depuis 1974. L’amortissement de principal documenté ici couvre 2019–2024 ; la source ne fournit intérêts et charge totale que pour 2023–2024.
- La ventilation exacte PLF/PLFSS des 43 Md€ reste inconnue ; aucun total de mesures recoupées n’est calculé.
- Axe-core ne contrôle qu’une partie des critères : **aucune certification RGAA/WCAG complète n’est revendiquée**. Audits lecteur d’écran, zoom navigateur natif et mobile réel à réaliser.
- Tests citoyens **non réalisés** : [protocole](tests-utilisateurs-dashboard.md). L’objectif « moins d’une minute » n’est pas encore validé avec des personnes.
- Build statique prêt ; **aucun déploiement distant effectué** faute de cible d’hébergement et de validation des droits des sources.

Méthode et décisions : [méthodologie](methodologie-budget.md), [contrat](contrat-donnees.md), [ADR-005](adr/005-agregats-citoyens.md), [ADR-006](adr/006-solde-et-dette.md).
