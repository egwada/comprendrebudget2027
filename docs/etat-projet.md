# État du projet — Point de repère

> Document généré automatiquement le 2025-01-14.
> Branche active : `main`
> Dernier commit : `e60c729` — "chore(entire): enable checkpoint search skill for Pi"
> Arbre de travail : propre (rien à valider)

---

## 1. Vision produit

Tableau de bord budgétaire citoyen autour du PLF 2027 et du PLFSS.

Objectif : permettre à un citoyen de répondre en **moins d'une minute** à 4 questions :
1. Combien l'État prévoit-il de dépenser en 2027 ?
2. Quels sont les principaux postes de dépenses ?
3. Comment ces montants évoluent-ils par rapport à 2026 ?
4. Que finance concrètement une mission donnée ?

Principe directeur : première lecture simple, deuxième clic explicatif, troisième niveau technique.

---

## 2. Stack technique

| Couche | Technologie |
|--------|-------------|
| Extraction ETL | Python 3, `pdfplumber`, CSV, DuckDB |
| Dashboard | React 19, TypeScript, Vite, DuckDB-WASM, Recharts |
| Tests | Node test runner, Python scripts, axe-core, Chromium headless (CDP) |

---

## 3. Pipeline données

```
PDFs sources
    ↓ (extract_budget.py)
data/raw/raw_credits.csv
    ↓ (transformation Python)
data/staging/{dim_mission.csv, dim_contexte.csv, fact_credits.csv, fact_mesures_plfss.csv}
    ↓ (prepare_dashboard.py)
sqlrooms-dashboard/public/data/ + public/sources/
    ↓ (vite build)
sqlrooms-dashboard/dist/ (build statique prêt à servir)
```

**Empreintes PDF (SHA-256)** :
- PLF : `132274b83bed4861a9e1a147d0d16abda2d729cdad2373ef804e26747c43d881`
- PLFSS : `71010873c0af8a776436e3c22628d3a1dc048ea406632afa2107dc83be7c598d`
- NEB 2024 (Cour des comptes, AFT) : archivé sous `sources/neb-2024-gestion-dette-tresorerie-etat.pdf`

**Sources financières publiques additionnelles** :
- AMECO (Commission européenne, 2026-06-02) : `sources/ameco0_csv.zip` — solde APU, intérêts APU, encours dette APU
- INSEE série 001717255 : `sources/insee-solde-budget-general-etat.xml` — solde mensuel du budget général de l'État (2009–2025)

---

## 4. Architecture de navigation

Quatre vues principales via un routeur léger interne (`URLSearchParams`, `history.pushState`) :

| Vue | URL | Contenu |
|-----|-----|---------|
| **Accueil** | `?vue=accueil` (défaut) | 5 cartes résumées, treemap CP 2027 par mission |
| **Budget de l'État** | `?vue=budget` | KPI CP/AE, tableau 32 missions, treemap, graphique comparatif, fiches programmes |
| **Solde et dette** | `?vue=dette` | Série solde APU 1974–2024, solde budget général 2009–2025, intérêts APU, encours dette APU, amortissements et financement de la dette État 2019–2024 |
| **Mesures et contexte** | `?vue=contexte` | 43/54 Md€, 17 mesures PLFSS |
| **Méthodologie** | `?page=methodologie` | Glossaire, sources, réserves, sans chargement WASM |

Comportements : onglets persistants avec `aria-current="page"`, retour Accueil sur chaque vue, URLs partageables, retour navigateur conservé, fiche mission préservée.

---

## 5. Chiffres clés validés (budget général brut)

| Indicateur | LFI 2026 | PLF 2027 | Évolution |
|------------|----------|----------|-----------|
| CP | 593 890 071 649 € | 615 139 875 333 € | +21,2 Md€ (+3,6 %) |
| AE | 620 249 232 626 € | 632 868 821 128 € | +12,6 Md€ |
| Missions | 32 | 32 | — |
| Programmes/dotations | 135 | 135 | — |
| Faits | — | — | 668 |

- Premier poste CP 2027 : Remboursements et dégrèvements = 144,5 Md€
- Investir pour la France de 2030 : 3 999 870 000 € CP 2027 (pages 309–310)
- Les totaux mission imprimés réconcilient avec les sommes des programmes dans les 4 colonnes (aucun écart actuel ; mécanisme d'alerte validé par injection)

**Réserve de lecture** : les crédits 2027 sont les prévisions d’un projet de loi présenté au Parlement. Ils ne sont pas des dépenses exécutées et peuvent évoluer pendant l’examen.

---

## 6. Séries financières publiques intégrées

| Série | Période | Source | Périmètre |
|-------|---------|--------|-----------|
| Solde net de financement APU | 1974–2024 | AMECO (EDP) | Administrations publiques |
| Intérêts APU | 1978–2024 | AMECO | Administrations publiques |
| Encours dette APU | 1977–2024 | AMECO | Administrations publiques |
| Solde budget général État | 2009–2025 | INSEE 001717255 (décembre) | Budget général de l'État |
| Amortissements MLT, émissions, intérêts payés | 2019–2024 | Cour des comptes / AFT (NEB 2024) | État |

**Réserve** : la série du seul budget de l'État depuis 1974 n'a pas été établie. La série APU ne prétend pas démontrer une affirmation sur le budget de l'État seul (ADR-006).

---

## 7. Validation actuelle

| Type | Résultat |
|------|----------|
| Contrôles headless (UI réelle navigateur) | ✅ 117/117 PASS |
| Base DuckDB téléchargeable et dictionnaire de schéma | ✅ 5/5 PASS |
| Tests de données cohérence Python (budget + finances publiques) | ✅ 11/11 PASS |
| Tests unitaires Node | ✅ 7/7 PASS |
| Lint (oxlint) | ✅ PASS sans avertissement |
| Build statique | ✅ OK (warning mineur : import statique+dynamique de `duckdb.ts`) |
| Régression (injection écart 1 M€) | ✅ Détectée sans corruption des KPI |

---

## 8. Fonctionnalités implémentées

### Navigation
- [x] Routeur interne à 4 vues (Accueil, Budget, Solde/Dette, Contexte)
- [x] Onglets persistants avec `aria-current="page"`
- [x] URLs partageables et historique navigateur préservé
- [x] Retour Accueil sur chaque vue secondaire
- [x] Méthodologie accessible sans chargement WASM (`?page=methodologie`)

### Accueil
- [x] 5 cartes résumées : CP 2027 + évolution, dernier solde exécuté budget général, encours dette APU, intérêts APU, principal MLT amorti
- [x] Treemap CP 2027 groupée par mission (avec tableau alternatif)
- [x] Chaque carte indique année, périmètre, statut (prévu/exécuté) et source

### Budget de l'État
- [x] KPI CP/AE 2026/2027 avec delta
- [x] Vue citoyenne (5 postes, "pour 100 €")
- [x] Tableau des 32 missions (tri, recherche, réinitialisation, `aria-sort`)
- [x] Treemap interactive
- [x] Graphique comparatif barres
- [x] Fiche mission avec drill-down programmes (Investir 2030 complet)

### Solde et dette
- [x] Graphique solde APU 1974–2024 en % du PIB (ligne zéro, déficit en rouge neutre)
- [x] Graphique solde budget général État 2009–2025
- [x] Graphique intérêts APU 1978–2024
- [x] Graphique encours dette APU 1977–2024
- [x] Tableau amortissements MLT, émissions, intérêts payés, charge totale (2019–2024)
- [x] Exports CSV sourcés pour chaque série

### Contexte et mesures
- [x] Section Mesures PLFSS (17 mesures, 278,7 / 5,1 / −12,7 Md€)
- [x] Contexte éditorial (43/54 Md€ distincts, non-additifs)
- [x] Exports CSV sourcés (classement, programmes, brut, contexte, PLFSS)

### Données et réutilisation
- [x] Base DuckDB téléchargeable, générée depuis les mêmes CSV que le dashboard
- [x] 8 tables de données, 5 vues analytiques, catalogue de tables/champs et descriptions dans la méthodologie
- [x] Liste documentée des 10 fichiers d’origine archivés dans `sources/`

### Accessibilité et robustesse
- [x] Navigation clavier (Entrée/Espace/Tab), focus restauré, retour navigateur
- [x] Accessibilité axe-core (5+ audits sans violation détectée)
- [x] Mobile 375 px sans débordement, zoom CSS 200 %, reduced-motion
- [x] Liens PLF/PLFSS vers les publications officielles ; rapport AFT servi avec type MIME PDF

---

## 9. Travaux réalisés (phases roadmap)

| Phase | État |
|-------|------|
| Phase 0 — Périmètre et vocabulaire | ✅ Terminé |
| Phase 1 — Fiabilisation des données | ✅ Terminé |
| Phase 2 — Vues citoyennes et expert | ✅ Terminé |
| Phase 3 — Agrégats, contexte, PLFSS | ✅ Terminé |
| Phase 4 — Exports, accessibilité, publication | ✅ Terminé |
| Phase 5 — Navigation par onglets et page d'accueil | ✅ Terminé |
| Phase 6 — Solde et dette historiques | ✅ Terminé |
| Phase 7 — Tests utilisateurs et déploiement distant | ⏳ Non démarré |

---

## 10. Blocages et réserves connus

| Problème | Gravité | Statut |
|----------|---------|--------|
| Tests utilisateurs réels non réalisés | Moyenne | À planifier — protocole prêt dans `docs/tests-utilisateurs-dashboard.md` |
| Audit lecteur d'écran / mobile réel non fait | Moyenne | Complémentaire à axe-core |
| Déploiement GitHub Pages | Faible | Configuré via Actions : https://egwada.github.io/comprendrebudget2027/ |
| WASM DuckDB ~35 Mo au premier chargement | Faible | À mesurer sur connexion lente avant publication grande audience |
| Crédits du PLF non exécutés | Information | Libellés comme prévisions ; liens vers les publications officielles |
| Série du seul budget de l'État depuis 1974 non établie | Information | Série APU utilisée avec périmètre explicitement limité (ADR-006) |
| Intérêts/charge totale dette État 2019–2022 absents de la source AFT | Information | Tableau limité aux années disponibles |

---

## 11. Prochaines étapes possibles

1. **Vérifier le déploiement GitHub Pages** après les prochains changements sur `main`.
2. **Réaliser des tests utilisateurs** selon le protocole documenté
3. **Auditer l'accessibilité** avec lecteur d'écran et mobile réel
4. **Mesurer les performances** sur connexion lente (chargement WASM)
5. **Rechercher la série officielle** du solde du budget de l'État depuis 1974 (Direction du Budget, lois de règlement)
6. **Poursuivre la roadmap** (phase 7 : publication, communication, maintenance)

---

## 12. Commandes de référence

```bash
# Rejouer la validation complète
cd sqlrooms-dashboard
npm ci
npm run prepare:data
npm test
npm run test:data
npm run lint
npm run build:publication
npm run test:headless

# Alternative port si 8901 occupé
python3 ../scripts/validate_headless.py --port 8928

# Rafraîchir les données AMECO/INSEE
npm run refresh:finance
```

---

## 13. Fichiers clés

| Fichier | Rôle |
|---------|------|
| `extract_budget.py` | Extraction déterministe des PDFs |
| `scripts/prepare_dashboard.py` | Préparation des données pour le build |
| `scripts/refresh_finances_publiques.py` | Rafraîchissement AMECO/INSEE |
| `scripts/test_data.py` | Tests de cohérence budget |
| `scripts/test_finances_publiques.py` | Tests de cohérence séries financières |
| `scripts/validate_headless.py` | Validation UI headless (Chromium CDP) |
| `sqlrooms-dashboard/src/App.tsx` | Application React principale (routeur) |
| `sqlrooms-dashboard/src/components/Home.tsx` | Page d'accueil |
| `sqlrooms-dashboard/src/components/SoldeEtDette.tsx` | Page solde et dette |
| `docs/roadmap-dashboard-citoyen.md` | Feuille de route détaillée |
| `docs/plan-navigation-par-onglets.md` | Plan de la navigation par onglets |
| `docs/plan-solde-et-dette.md` | Plan des séries historiques |
| `docs/validation.md` | Rapport de validation |
| `docs/contrat-donnees.md` | Contrat qualité données |
| `docs/adr/001-extraction-pdf.md` | ADR extraction |
| `docs/adr/005-agregats-citoyens.md` | ADR agrégats |
| `docs/adr/006-solde-et-dette.md` | ADR séries historiques |

---

*Ce document sert de point d'ancrage pour reprendre le projet ultérieurement.*
