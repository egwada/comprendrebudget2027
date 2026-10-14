# Tableau de bord budgétaire citoyen

Prototype React/TypeScript + DuckDB-WASM, à partir des PDF locaux PLF/PLFSS 2027. **Le PLF fourni est fictif / simulé : ce n’est pas un budget officiel réel.**

## Installation et lancement

Prérequis : Node 22.18+ (tests TypeScript natifs), npm, Python 3.10+, `pdfplumber`, `websocket-client` et Chromium pour les tests headless.

Les deux PDF sources sont versionnés à la racine afin que le build de publication GitHub Pages puisse régénérer et servir les mêmes données :

- `l17b3210_projet-loi.pdf` ;
- `plfss_2027_texte.pdf`.

```bash
# depuis sqlrooms-dashboard/
npm ci
python3 -m pip install pdfplumber websocket-client
npm run prepare:data
npm run dev
```

`prepare:data` régénère les crédits, copie les deux CSV curatés de `../sources/`, et rend les PDF disponibles sous `public/sources/`. Il échoue explicitement si une source manque. Les fichiers générés ne sont pas versionnés.

## Validation

```bash
npm test                 # 7 tests unitaires : formatage, contraste, treemap et CSV
npm run test:data       # 11 tests de cohérence des données
npm run lint
npm run build:publication
npm run test:headless   # 113 contrôles sur le build servi en statique
# si le port par défaut 8901 est occupé :
python3 ../scripts/validate_headless.py --port 8928
```

Le navigateur headless utilise un profil isolé et un port CDP libre. Les tests comparent les KPI aux totaux mission via une agrégation Python indépendante. Ils injectent aussi un écart de 1 M€ dans le CSV du **build uniquement**, puis restaurent ses octets en `finally`, pour vérifier les alertes de qualité.

## Fonctionnalités

- vue citoyenne CP par défaut, classement horizontal, cinq premiers postes, lecture pour 100 € ;
- AE, recherche, réinitialisation et dénominateurs explicités ;
- fiches mission, programmes, évolution et pages PDF ;
- tableaux accessibles et exports CSV sourcés ;
- mode expert : treemap, comparaison, données brutes, SQL, contrôle qualité ;
- chiffres de contexte 43/54 Md€ et mesures PLFSS séparés, sans total artificiel ;
- page `/?page=methodologie`, glossaire, sources et limites ;
- navigation clavier, focus restauré, responsive, réduction des animations.

Les graphiques sont chargés à la demande. La méthodologie ne charge ni DuckDB ni le WASM (~35 Mo pour le dashboard). Aucun service distant n’est nécessaire après installation et préparation.

## Publication statique

```bash
npm run build:publication
npm run preview -- --host 127.0.0.1
```

Publier **tout `dist/`**, y compris `data/`, `sources/` et `duckdb/`. Les URLs respectent `BASE_URL` : le build local cible la racine, tandis que le workflow Pages utilise `/comprendrebudget2027/`. Servir `.wasm` avec `application/wasm`, `.js` avec un type JavaScript, `.pdf` avec `application/pdf`. Le worker et le WASM doivent rester sur la même origine. Aucun routage serveur spécial : les vues utilisent des paramètres de requête et les missions un fragment d’URL.

Vérifier les droits de redistribution des PDF et garder le bandeau de démonstration. Ne pas conserver les CSV avec un cache immutable : leurs chemins ne sont pas versionnés. Les assets hachés peuvent être mis en cache longtemps.

Le workflow `../.github/workflows/deploy-pages.yml` teste, construit et déploie automatiquement `main` sur GitHub Pages. URL du site : https://egwada.github.io/comprendrebudget2027/. La source Pages du dépôt doit être configurée sur **GitHub Actions**. Il reste à réaliser les tests utilisateurs et l’audit manuel RGAA ; les contrôles axe-core automatisés ne constituent pas une certification.

Documentation : `../docs/validation.md`, `../docs/methodologie-budget.md`, `../docs/contrat-donnees.md`, `../docs/roadmap-dashboard-citoyen.md`.
