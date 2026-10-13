# ADR 002 : Architecture SQLRooms avec DuckDB (vues et tables)

**Statut** : Accepted

## Contexte

Le tableau de bord est développé avec **SQLRooms** (https://sqlrooms.org), une stack basée sur :
- **DuckDB** embarqué en WASM dans le navigateur,
- **React** pour l'interface,
- Des requêtes SQL directes pour alimenter les graphiques et tableaux.

Les données extraites du PDF (~300–500 lignes de crédits par mission/programme) sont de petite taille. L'interactivité requise est :
- filtrage par mission,
- drill-down programme,
- comparaison LFI 2026 vs PLF 2027,
- agrégations par titre budgétaire.

### Séparation des responsabilités

L'utilisateur a explicitement demandé :
- **Option A (vue)** pour la couche présentation / métier du dashboard.
- **Option B (table)** pour la couche brute / staging des données extraites du PDF.
- Possibilité d'utiliser des **vues matérialisées DuckDB** pour les agrégations fréquentes.

## Décision

**Architecture en trois couches : staging (table) → modèle métier (vues) → snapshot (vues matérialisées).**

### Schéma

```
┌─────────────────────────────────────────────────────────────┐
│  STAGING (tables brutes, alimentées par le script Python)   │
│  ├── raw_credits       (CSV / Parquet)                      │
│  └── raw_missions      (CSV / Parquet, optionnel)           │
├─────────────────────────────────────────────────────────────┤
│  MODÈLE MÉTIER (vues SQL, nettoyage + jointures)           │
│  ├── v_dim_mission     (mission, titre)                    │
│  ├── v_dim_programme   (programme, mission_parent)         │
│  └── v_fact_credits    (type_credit, annee, montant,       │
│                         mission, programme, titre)          │
├─────────────────────────────────────────────────────────────┤
│  SNAPSHOT / PERF (vues matérialisées DuckDB)               │
│  ├── vm_credits_par_mission    (agrégation AE+CP/mission)  │
│  ├── vm_comparaison_2026_2027  (évolution LFI→PLF)         │
│  └── vm_totaux_par_titre       (sommes par titre)           │
└─────────────────────────────────────────────────────────────┘
```

### Détails de la décision

1. **Tables brutes (`raw_*`)** :
   - Chargées depuis les fichiers CSV/Parquet produits par le script d'extraction (ADR 001).
   - Pas de contrainte d'intégrité, pas de nettoyage SQL — le but est de refléter fidèlement les données extraites.

2. **Vues métier (`v_*`)** :
   - `v_dim_mission` : déduplique les noms de mission, associe le titre budgétaire.
   - `v_dim_programme` : liste les programmes avec leur mission parent.
   - `v_fact_credits` : table de faits normalisée, prête pour les requêtes analytiques.
   - Les vues permettent d'itérer sur la logique métier sans ré-exporter les données brutes.

3. **Vues matérialisées (`vm_*`)** :
   - Utilisées uniquement pour les calculs répétés ou les grilles de comparaison.
   - Syntaxe DuckDB : `CREATE TABLE vm_nom AS SELECT ... FROM v_fact_credits GROUP BY ...`
   - Régénérées à la demande (bouton "Rafraîchir" dans l'UI) ou au chargement initial.
   - Sur ~500 lignes, le gain de perf est minime, mais cela démontre le pattern et prépare l'architecture si le dataset grossit (ex. ajout d'années historiques).

4. **Pas de SCD (Slowly Changing Dimensions)** : les données sont un snapshot annuel. Si on ajoute d'autres années plus tard, on passera à un modèle avec colonne `annee` en dimension temporelle.

5. **SQLRooms specifics** :
   - Les requêtes SQL sont écrites dans des fichiers `.sql` séparés, référencés par les composants React.
   - Les données sont chargées via `duckdb-wasm` avec `INSERT INTO` depuis les fichiers CSV/Parquet locaux.

## Conséquences

### Positives

- **Séparation des responsabilités** : extraction (Python) ≠ modèle (SQL) ≠ présentation (React).
- **Itération rapide** : modifier une vue métier ne nécessite pas de ré-exécuter le script d'extraction.
- **Auditabilité** : on peut toujours requêter `raw_credits` pour vérifier la provenance d'un chiffre.
- **Extensible** : ajouter une nouvelle année = ajouter des lignes dans `raw_credits`, les vues s'adaptent.

### Négatives

- **Complexité relative** : pour seulement ~500 lignes, un modèle en 3 couches est sur-ingénieré. C'est un choix conscient pour démontrer le pattern SQLRooms.
- **Vue matérialisée = snapshot** : si les données brutes changent, il faut recréer les `vm_*`. SQLRooms gère cela via un bouton de rechargement.
- **DuckDB WASM limitations** : pas de persistance de session (IndexedDB possible mais non activée par défaut). Les données sont rechargées à chaque ouverture du dashboard.

## Piège de types : Arrow `decimal128` vs Recharts (2027-…)

**Symptôme** : le treemap n'affichait qu'une seule cellule (aires toutes à 0).

**Cause** : `SUM(montant)` en DuckDB retourne `HUGEINT` (int128), exporté par Arrow en `decimal128(38,0)`, rendu par `apache-arrow` JS en objet `DecimalBigNum` — pas un `number`. Or le `computeNode` de Recharts fait `typeof v === 'number' ? v : 0` → toutes les valeurs de treemap tombent à 0.

**Décision** :
1. **Contrat SQL explicite** — toute agrégation exposée à l'UI est castée : `(SUM(...))::DOUBLE AS y2027`. DOUBLE est sans perte ici (montants < 2^53).
2. **Défense dans `query()`** — conversion `bigint`/`DecimalBigNum` → `Number` avant de rendre les lignes à React.

Règle : **la couche SQL garantit des types primitifs JSON-friendly** ; la couche JS ne suppose rien des types Arrow.
