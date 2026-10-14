# Comprendre le budget 2027

Tableau de bord indépendant pour explorer les crédits proposés dans le **projet de loi de finances 2027** et les mesures du **PLFSS 2027**.

- **Site en ligne :** <https://egwada.github.io/comprendrebudget2027/>
- **Données et fichiers sources :** [`sources/`](https://github.com/egwada/comprendrebudget2027/tree/main/sources)
- **Télécharger la base DuckDB :** <https://egwada.github.io/comprendrebudget2027/downloads/comprendrebudget2027.duckdb>
- **Méthodologie et dictionnaire des données :** disponibles dans l’onglet « Méthodologie » du site.

## Objectifs

Le tableau de bord aide à comprendre les crédits de paiement (CP) et autorisations d’engagement (AE), à comparer le PLF 2027 à la loi de finances initiale 2026 et à explorer le détail des missions et programmes. Des vues séparées présentent les soldes exécutés, la dette, les intérêts, le financement de l’État et des repères de finances publiques.

Les crédits du PLF et les mesures du PLFSS sont des **prévisions proposées au Parlement** ; ils ne sont pas des dépenses exécutées. Les séries d’exécution historiques sont identifiées séparément et leurs périmètres sont précisés.

## Sources et compilation des données

- **PLF 2027 :** PDF publié par l’Assemblée nationale, notamment le récapitulatif général des missions et programmes (p. 307–313) et le rapport général (p. 11–13). [Ouvrir le document officiel](https://www.assemblee-nationale.fr/dyn/17/textes/l17b3210-projet-loi.pdf).
- **PLFSS 2027 :** publication officielle [PLFSS_2027_web.pdf](https://www.budget.gouv.fr/documentation/file-download/33499). Les mesures affichées sont sélectionnées et sourcées par article et page ; elles peuvent se recouper et ne sont pas additionnées.
- **Solde, dette et financement :** séries AMECO, série INSEE 001717255 et rapport 2024 de la Cour des comptes utilisant les données de l’AFT. Les fichiers archivés et CSV curatés sont documentés dans [`sources/`](https://github.com/egwada/comprendrebudget2027/tree/main/sources).

Le pipeline est reproductible : `extract_budget.py` extrait les lignes budgétaires du PDF PLF et produit le CSV brut ; `scripts/prepare_dashboard.py` prépare les CSV utilisés par le site ; `scripts/build_database.py` construit une base DuckDB autonome avec les tables, vues d’analyse et catalogues de schéma. Les règles d’extraction, les périmètres, les sources et les descriptions de chaque champ sont détaillés dans l’onglet « Méthodologie » et dans [`docs/`](docs/).

## Utiliser la base DuckDB

Télécharger le fichier `comprendrebudget2027.duckdb`, puis l’ouvrir avec DuckDB (CLI ou Python). Par exemple :

```sql
SHOW TABLES;
DESCRIBE fact_credits;
SELECT * FROM v_compare_missions ORDER BY cp_2027 DESC LIMIT 10;
```

La base contient huit tables de données, cinq vues analytiques et deux tables de catalogue (`dataset_catalog`, `column_catalog`). Le dictionnaire du site décrit les tables, les champs, leurs types, leurs sources et leurs limites.

## Lancer et vérifier le projet en local

Prérequis : Node.js 22.18+, Python 3.10+, `pdfplumber`, DuckDB Python 1.5.6 et Chromium pour les tests navigateur.

```bash
python3 -m pip install pdfplumber duckdb==1.5.6
cd sqlrooms-dashboard
npm ci
npm run prepare:data
npm run dev
```

Pour vérifier la préparation, les tests et le build de publication :

```bash
npm test
npm run test:data
npm run test:database
npm run lint
npm run build:publication
npm run test:headless
```

Le workflow GitHub Actions [`deploy-pages.yml`](.github/workflows/deploy-pages.yml) exécute les contrôles, construit le site et déploie automatiquement les changements de `main` sur GitHub Pages.
