# ADR 006 — Séries historiques de solde public et de financement de la dette

**Statut** : Accepté — 2026-10-14  
**Branche** : `feat/deficit-dette-historique`

## Contexte

Le prototype initial ne dispose que de crédits prévus dans le projet de loi de finances 2027 ; il ne contient pas de série d’exécution historique de ces crédits. L’affirmation « pas de budget à l’équilibre depuis 1974 » nécessite un périmètre précis : les données longues disponibles sur le solde selon la procédure de déficit excessif portent sur les **administrations publiques** et ne décrivent pas à elles seules le budget de l’État.

Les remboursements de principal sont des flux de financement. Ils doivent être montrés séparément des intérêts, de la charge budgétaire totale et des émissions de dette.

## Décisions

1. Curater les séries officielles AMECO dans des tables distinctes :
   - `fact_solde_apu` : 1974–2024, solde net de financement EDP en % du PIB et en Md ECU/EUR selon l’unité de la source ;
   - `fact_interets_apu` : premières observations disponibles en 1978–2024, intérêts APU selon les comptes nationaux ; aucune année manquante n’est transformée en zéro ;
   - `fact_encours_dette_apu` : série historique liée à partir de 1977–2024.
2. Afficher le solde en % du PIB autour d’une ligne zéro et désigner explicitement le périmètre APU. Dans la version AMECO archivée, 1974 est le dernier solde non déficitaire ; les observations 1975–2024 sont négatives. Ce constat ne doit pas être réécrit comme une série du seul budget de l’État.
3. Ajouter séparément `fact_solde_budget_general_etat`, construit depuis la série mensuelle INSEE 001717255 en retenant l’observation de décembre de chaque année complète, de 2009 à 2025. Cette série correspond au budget général, n’inclut pas le solde des comptes spéciaux publié à part et ne permet pas de remonter jusqu’en 1974.
4. Curater dans `fact_financement_dette_etat` le tableau d’exécution AFT 2019–2024 publié dans le rapport de la Cour des comptes sur le budget 2024 : principal amorti à moyen/long terme, part nominale, indexation, émissions MLT et, lorsqu’elles sont publiées, intérêts payés et charge totale de la dette.
5. Ne jamais additionner principal amorti, intérêts, émissions et encours aux crédits budgétaires ordinaires. Les intérêts/charge de la dette 2019–2022 absents de ce tableau restent manquants.
6. Versionner les données curatées et les sources d’origine sous `sources/`. Le rafraîchissement AMECO est reproductible par `scripts/refresh_finances_publiques.py`. La préparation du dashboard reste hors ligne et copie les sources curatées vers `public/data/`.

## Sources

- Commission européenne, **AMECO — Annual Macro-Economic Database**, archive CSV récupérée le 2026-06-02, table et codes indiqués dans les fichiers CSV : [page officielle de téléchargement](https://economy-finance.ec.europa.eu/economic-research-and-databases/economic-databases/ameco-database/download-annual-data-set-macro-economic-database-ameco_en).
- INSEE, série 001717255, **Situation mensuelle du budget de l’État — Solde général d’exécution — Cumul depuis le début de l’année**, relevés de décembre 2009–2025 : [fiche de la série](https://www.insee.fr/fr/statistiques/serie/001717255), données XML archivées sous `sources/insee-solde-budget-general-etat.xml`.
- Cour des comptes, **Le budget de l’État en 2024 — Résultats et gestion**, synthèse p. 6 (intérêts et charge 2023–2024) et tableau 1 p. 14–15 (amortissements et financement, pagination imprimée), données AFT. Copie archivée : `sources/neb-2024-gestion-dette-tresorerie-etat.pdf`.

## Conséquences et limites

- Le dashboard rend visibles l’historique du solde APU, les intérêts/encours APU et le financement de la dette de l’État dans des blocs séparés et sourcés.
- La longue série officielle du **seul budget de l’État depuis 1974** n’a pas été établie dans cette tranche. Une série du budget général est disponible de 2009 à 2025 ; la carte historique 1974–2024 porte explicitement sur les APU et la méthodologie expose cette réserve.
- L’historique détaillé du principal affiché couvre 2019–2024 ; le rapport récupéré ne fournit les intérêts payés et la charge totale que pour 2023–2024. Ces limites sont visibles dans le tableau et l’export.
- Les séries AMECO peuvent être révisées. Leur version source est conservée dans les observations et l’archive téléchargée.
