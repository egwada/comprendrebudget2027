# Méthodologie du tableau de bord citoyen

La page publique est accessible à `/?page=methodologie` et ne charge pas DuckDB. Elle comporte le glossaire et les liens directs vers les publications officielles.

## Sources

- [Projet de loi de finances 2027 — Assemblée nationale](https://www.assemblee-nationale.fr/dyn/17/textes/l17b3210-projet-loi.pdf) : récapitulatif p. 307–313 et rapport général p. 11–13.
- [PLFSS_2027_web.pdf — ministère du Budget](https://www.budget.gouv.fr/documentation/file-download/33499) : mesures curatées, notamment p. 45 et 106–121.

Le tableau de bord est une présentation indépendante de ces documents. Les crédits du PLF et les mesures du PLFSS sont des propositions/prévisions ; ils ne constituent pas des données d’exécution.

## Calcul des crédits

Chaque KPI mission utilise la ligne total imprimée. Les programmes sont conservés au deuxième niveau et contrôlés par réconciliation (mission × année × CP/AE). Un écart reste une alerte, pas une correction implicite. Les quatre colonnes réconcilient actuellement.

Les cellules vides sont interprétées comme zéro, avec marqueur de qualité. Cette règle est spécifique au récapitulatif fourni. Les lignes sans crédits restent présentes. Les libellés multi-lignes sont assemblés avant l’attribution des programmes.

LFI 2026 = crédits votés ; PLF 2027 = crédits proposés. Euros courants, sans correction d’inflation. CP et AE sont deux lectures alternatives, jamais additionnées. Les crédits prévus ne sont pas des dépenses exécutées. Des séries historiques d’exécution distinctes sont présentées plus bas à partir d’AMECO et d’un rapport de la Cour des comptes.

## Périmètres et dénominateurs

Budget général brut : 32 missions, remboursements et dégrèvements fiscaux inclus. Ne pas interpréter tous les postes comme des services publics. Le classement, ses parts, les KPI et le calcul pour 100 € suivent la recherche. Une fiche mission indique sa part du budget complet, explicitement. Les montants visuels sont arrondis ; les exports contiennent les euros entiers.

Les administrations publiques incluent un périmètre plus large que l’État. Les chiffres de contexte et les mesures PLFSS sont indépendants des filtres du budget général.

## Solde public et dette historique

La série AMECO du solde net de financement EDP couvre 1974–2024 pour les administrations publiques (APU), en % du PIB et en Md ECU/EUR selon l’unité de la source. Dans cette version, 1974 est le dernier solde non déficitaire et les observations de 1975 à 2024 sont négatives. Cette série ne permet pas de conclure sur le seul budget de l’État. AMECO fournit les dépenses d’intérêts des APU à partir de 1978 et une série historique liée de l’encours brut à partir de 1977 ; les données manquantes ne sont pas ramenées à zéro.

Pour compléter ce périmètre, la série INSEE 001717255 montre le solde exécuté du **budget général de l’État** de 2009 à 2025. Chaque valeur est celle de décembre, cumulée depuis le début de l’année, convertie en Md€ courants ; les comptes spéciaux sont publiés séparément. Cette série ne remonte pas à 1974 et l’année 2026, incomplète, n’est pas affichée. Voir la [fiche INSEE](https://www.insee.fr/fr/statistiques/serie/001717255).

Le tableau AFT du rapport de la Cour des comptes sur le budget 2024 donne l’exécution des amortissements de dette à moyen/long terme de l’État pour 2019–2024. En 2024, il indique 155,1 Md€ d’amortissement MLT (dont 151,1 Md€ de nominal remboursé) et 285 Md€ d’émissions MLT nettes des rachats. Le rapport indique aussi 46,5 Md€ d’intérêts payés et 49,3 Md€ de charge totale de dette en 2024 ; ce ne sont pas des montants interchangeables. Les valeurs d’intérêts/charge totale antérieures à 2023 ne sont pas disponibles dans le tableau curaté. Le principal remboursé et les émissions sont des opérations de financement : ils ne sont pas ajoutés aux dépenses ordinaires.

La mission « Engagements financiers de l’État » est mise en évidence par un accent bleu et un appel « Voir le détail de la dette et des intérêts ». C’est un repère de navigation vers les programmes, pas une alerte ni un jugement sur leur importance.

Sources et définitions : [PLF 2027, Assemblée nationale](https://www.assemblee-nationale.fr/dyn/17/textes/l17b3210-projet-loi.pdf), [PLFSS_2027_web.pdf, ministère du Budget](https://www.budget.gouv.fr/documentation/file-download/33499), [AMECO, Commission européenne](https://economy-finance.ec.europa.eu/economic-research-and-databases/economic-databases/ameco-database/download-annual-data-set-macro-economic-database-ameco_en) et rapport source de la [Cour des comptes](../sources/neb-2024-gestion-dette-tresorerie-etat.pdf). Voir [ADR-006](adr/006-solde-et-dette.md).

> Les 43 Md€ concernent les textes financiers PLF + PLFSS. Les 54 Md€ agrègent un périmètre plus large et une trajectoire à politique inchangée. Ils ne correspondent pas à la variation des crédits du seul budget général entre 2026 et 2027.

La ventilation PLF/PLFSS n’est pas publiée dans les sources disponibles. Les mesures PLFSS se recoupent : pas de total artificiel. Objectifs de dépenses, soldes, transferts de dette, économies et recettes restent distingués. 11 Md€ = 54 − 43 est marqué comme dérivé.

## Reproduction

Voir [contrat-donnees.md](contrat-donnees.md), [glossaire-budget.md](glossaire-budget.md), [ADR-005](adr/005-agregats-citoyens.md), [ADR-006](adr/006-solde-et-dette.md) et [validation.md](validation.md). `scripts/refresh_finances_publiques.py` récupère AMECO et le rapport source puis génère les CSV curatés. Le build de publication copie les CSV et le rapport de la Cour des comptes dans `public/`; les liens PLF/PLFSS ouvrent les éditeurs officiels.
