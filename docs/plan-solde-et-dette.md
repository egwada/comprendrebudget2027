# Plan — Solde budgétaire et dette

**Branche** : `feat/deficit-dette-historique`  
**Statut** : première implémentation terminée ; le périmètre du solde et les années non disponibles restent explicitement limités.
**Périmètre du prototype actuel** : le PLF 2027 local est simulé. Ses chiffres ne doivent pas être présentés comme des données officielles.

## Objectif

Ajouter deux lectures factuelles et sourcées au tableau de bord :

1. Montrer l’évolution du **solde exécuté du budget de l’État** depuis 1974, si une série officielle comparable peut être constituée. Vérifier avant publication l’affirmation selon laquelle le budget n’aurait pas été à l’équilibre depuis cette date.
2. Rendre lisibles les intérêts de la dette et les remboursements de principal, en expliquant qu’il s’agit de flux différents et que le principal remboursé ne s’ajoute pas aux dépenses budgétaires ordinaires.

La présentation ne doit pas porter de jugement sur le niveau du déficit ou de la dette. Elle doit exposer les définitions, les périodes, les périmètres et les sources.

## Périmètres à ne pas confondre

- **Budget de l’État** : périmètre nécessaire pour étudier le solde budgétaire depuis 1974 et la charge budgétaire de la dette de l’État.
- **Administrations publiques (APU)** : périmètre plus large (État, collectivités et Sécurité sociale). Les séries INSEE / Eurostat peuvent fournir un point de comparaison, mais ne remplacent pas la série du budget de l’État.
- **Intérêts** : charge financière, à isoler des remboursements de principal.
- **Remboursement du principal et émissions de refinancement** : opérations de financement. Ne pas les additionner aux dépenses du budget comme s’il s’agissait d’un service public ou d’une charge d’intérêts.
- **Prévision et exécution** : afficher séparément les crédits prévus/votés, les prévisions de financement et les montants exécutés. Ne pas prolonger une série exécutée avec une prévision sans le signaler.

## Données à rechercher et à lister

| Série | Champs à collecter | Sources officielles à consulter | Usage / réserve |
|---|---|---|---|
| Solde annuel exécuté du budget de l’État, de 1974 au dernier exercice clos | année, recettes, dépenses, solde, unité, définition du solde, statut d’exécution, périmètre, référence et page | Direction du Budget : résultats d’exécution, comptes et lois de règlement / lois relatives aux résultats de la gestion et portant approbation des comptes ; rechercher les jeux associés sur data.gouv.fr | Série principale. Confirmer la disponibilité de chaque année et documenter les ruptures de définition, révisions ou changements de périmètre. Ne conclure « jamais à l’équilibre depuis 1974 » qu’après cette vérification. |
| Charge d’intérêts de la dette de l’État, exécutée annuellement | année, montant payé/exécuté, unité, méthode (budgétaire ou comptable), périmètre, référence et page | Rapports annuels de performance et documents d’exécution de la mission « Engagements financiers de l’État », notamment le programme « Charge de la dette et trésorerie de l’État » ; Direction du Budget | Vérifier si le poste figure déjà dans `fact_credits` et comment il est agrégé. Ne pas le compter une seconde fois dans le total du budget général. |
| Principal amorti / dette remboursée et émissions de refinancement | année, montant amorti, émissions brutes, émissions nettes si publiées, unité, statut prévision/exécution, définition, source | Agence France Trésor (AFT) : tableaux de financement, résultats et rapports annuels ; documents d’exécution de l’État | Présenter ces flux séparément des dépenses et des intérêts. Documenter la relation entre les échéances remboursées et le financement par émission de dette. |
| Encours de dette de l’État en fin d’année | année, encours, unité, date de référence, définition et source | AFT pour la dette de l’État | Contexte de stock ; ne pas le confondre avec les remboursements annuels ni avec la dette Maastricht des APU. |
| Solde, intérêts et dette des APU (série de comparaison facultative) | année, indicateurs, unité (% du PIB et/ou euros), secteur institutionnel, définition, source | Comptes nationaux de l’INSEE ; statistiques de finances publiques d’Eurostat (déficit/excédent, dette, intérêts) | Bloc de comparaison distinct, avec périmètre APU clairement indiqué ; ne pas l’utiliser pour étayer directement une affirmation sur le seul budget de l’État. |

Pour chaque fichier ou table retenu, consigner l’URL ou la référence bibliographique, la date de récupération, la version, l’unité, la couverture temporelle, la méthode, les éventuelles transformations et une empreinte du fichier source.

## Résultat de la collecte et limite de périmètre

- Archive AMECO de la Commission européenne, version 2026-06-02, récupérée et versionnée sous `sources/ameco0_csv.zip`. La série EDP du solde net de financement des APU couvre 1974–2024 : 1974 est à +0,0959 % du PIB et toutes les valeurs de 1975 à 2024 sont négatives. **Cette série n’est pas le solde du seul budget de l’État** ; l’interface le dit explicitement et n’étend pas l’affirmation à ce périmètre.
- La série INSEE 001717255 fournit le solde exécuté du budget général de l’État à la fin de chaque année complète, de 2009 à 2025. Elle est intégrée en Md€ courants ; les comptes spéciaux ont une série séparée et 2026 n’est pas complet.
- Les dépenses d’intérêts APU AMECO sont disponibles de 1978 à 2024 ; l’encours brut consolidé APU selon une série historique liée est disponible de 1977 à 2024.
- Le rapport 2024 de la Cour des comptes, données AFT, fournit les amortissements et émissions MLT de l’État sur 2019–2024. Il publie les intérêts payés et la charge totale de dette pour 2023–2024 : en 2024, 46,5 Md€ d’intérêts payés, 49,3 Md€ de charge totale, 155,1 Md€ d’amortissement MLT dont 151,1 Md€ de nominal, et 285 Md€ d’émissions MLT nettes des rachats. Ces chiffres restent dans des colonnes séparées.
- Les valeurs d’intérêts/charge totale pour 2019–2022 ne figurent pas dans la table curatée et demeurent manquantes. Le jeu de données détaillé de principal est donc limité à 2019–2024.
- Le rafraîchissement est reproductible par `python3 scripts/refresh_finances_publiques.py`. L’intégration et les critères de qualité sont détaillés dans [ADR-006](adr/006-solde-et-dette.md).

La série officielle du seul budget de l’État depuis 1974 reste à rechercher. La vue actuellement livrée répond au besoin historique sur les finances publiques au sens des APU, mais ne prétend pas démontrer une affirmation sur le budget de l’État seul.

## Modèle de données envisagé

Ne pas mélanger ces observations avec `fact_credits` (crédits prévus du PLF simulé) ni avec `dim_contexte` (quelques chiffres de contexte).

- `fact_solde_etat` : `annee`, `recettes_eur`, `depenses_eur`, `solde_eur`, `definition_solde`, `statut` (exécuté/prévision), `perimetre`, `source`, `source_page`, `note_qualite`.
- `fact_financement_dette_etat` : `annee`, `interets_eur`, `principal_amorti_eur`, `emissions_brutes_eur`, `emissions_nettes_eur`, `encours_fin_annee_eur`, ainsi que statut, définition, source, page et notes de qualité. Les valeurs absentes restent manquantes ; ne pas les remplacer par zéro.
- Si une série APU est retenue, la stocker à part avec secteur, unité et indicateur explicités.

Les colonnes effectivement publiées dépendront des données disponibles et de leurs définitions : ne pas calculer une valeur manquante par déduction silencieuse.

## Proposition de présentation neutre

1. Section intitulée **« Solde budgétaire exécuté de l’État »** : série annuelle autour d’une ligne zéro, années déficitaires et excédentaires représentées sans code couleur valorisant ou stigmatisant. Afficher la valeur, l’année, l’unité, le statut exécuté et la source au survol ou dans un tableau accessible.
2. Repère historique formulé après validation de la série. Préférer une phrase descriptive accompagnée de la définition à une affirmation non sourcée dans le titre.
3. Bloc séparé **« Intérêts et financement de la dette »** : charge d’intérêts, principal amorti, émissions de refinancement et encours, dans des indicateurs clairement séparés. Ajouter une explication visible indiquant que le principal remboursé et les intérêts ne sont pas la même chose et que le principal n’est pas additionné aux dépenses ordinaires.
4. Toute comparaison avec les APU apparaît dans un bloc identifié comme tel. Les montants prévus et exécutés ne sont jamais mis côte à côte sans libellé explicite.

## Étapes de réalisation

1. **Audit du prototype** : vérifier dans les données et les vues actuelles si la mission et le programme de charge de la dette sont présents, quels totaux les incluent et quelles informations sur le principal sont absentes.
2. **Inventaire des sources** : retrouver les séries officielles, leurs fichiers et métadonnées ; vérifier la couverture depuis 1974, les éventuels trous et les ruptures de définition.
3. **Curation** : construire les tables versionnées et documenter chaque transformation et chaque source ; conserver les données brutes d’origine.
4. **Contrôles** : comparer plusieurs années aux documents officiels, contrôler les unités, les doublons, les valeurs manquantes, le statut prévision/exécution et les périmètres.
5. **Intégration** : ajouter requêtes, composants, méthodologie et exports distincts ; ne pas altérer le total de crédits existant par ajout du principal.
6. **Validation** : tests de réconciliation et de non-double-comptage, vérification des sources depuis l’interface, accessibilité du graphique et affichage des données manquantes.

## Critères d’acceptation

- La série du solde couvre 1974 jusqu’au dernier exercice effectivement publié, ou chaque lacune est explicitement signalée.
- L’affirmation sur l’équilibre depuis 1974 n’est affichée que si les sources et la définition du solde la confirment pour toute la période.
- Chaque chiffre présenté est traçable à une source officielle, une période, une unité, un périmètre et un statut (prévision ou exécution).
- Intérêts, principal remboursé, émissions et encours restent distingués ; aucune somme ne mélange ces catégories.
- L’ajout ne modifie pas implicitement le total du budget général et n’attribue aucune authenticité au PLF 2027 simulé.
