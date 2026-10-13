# Méthodologie du tableau de bord citoyen

La page publique est accessible à `/?page=methodologie` et ne charge pas DuckDB. Elle comporte le glossaire et les sources PDF locales.

## Sources

- PLF 2027 local `l17b3210_projet-loi.pdf` : récapitulatif p. 307–313, rapport général p. 11–13.
- PLFSS local `plfss_2027_texte.pdf` : texte fourni, mesures curatées p. 45 et 106–121.

Le PLF est **fictif / simulé** (ADR-001). L’interface est un prototype non officiel ; la présence d’un document local ne prouve pas son authenticité.

## Calcul des crédits

Chaque KPI mission utilise la ligne total imprimée. Les programmes sont conservés au deuxième niveau et contrôlés par réconciliation (mission × année × CP/AE). Un écart reste une alerte, pas une correction implicite. Les quatre colonnes réconcilient actuellement.

Les cellules vides sont interprétées comme zéro, avec marqueur de qualité. Cette règle est spécifique au récapitulatif fourni. Les lignes sans crédits restent présentes. Les libellés multi-lignes sont assemblés avant l’attribution des programmes.

LFI 2026 = crédits votés ; PLF 2027 = crédits proposés. Euros courants, sans correction d’inflation. CP et AE sont deux lectures alternatives, jamais additionnées. Il n’y a aucune donnée de dépenses exécutées.

## Périmètres et dénominateurs

Budget général brut : 32 missions, remboursements et dégrèvements fiscaux inclus. Ne pas interpréter tous les postes comme des services publics. Le classement, ses parts, les KPI et le calcul pour 100 € suivent la recherche. Une fiche mission indique sa part du budget complet, explicitement. Les montants visuels sont arrondis ; les exports contiennent les euros entiers.

Les administrations publiques incluent un périmètre plus large que l’État. Les chiffres de contexte et les mesures PLFSS sont indépendants des filtres du budget général.

> Les 43 Md€ concernent les textes financiers PLF + PLFSS. Les 54 Md€ agrègent un périmètre plus large et une trajectoire à politique inchangée. Ils ne correspondent pas à la variation des crédits du seul budget général entre 2026 et 2027.

La ventilation PLF/PLFSS n’est pas publiée dans les sources disponibles. Les mesures PLFSS se recoupent : pas de total artificiel. Objectifs de dépenses, soldes, transferts de dette, économies et recettes restent distingués. 11 Md€ = 54 − 43 est marqué comme dérivé.

## Reproduction

Voir [contrat-donnees.md](contrat-donnees.md), [glossaire-budget.md](glossaire-budget.md), [ADR-005](adr/005-agregats-citoyens.md) et [validation.md](validation.md). Le build de publication copie les CSV générés et les deux PDF dans `public/`, puis `dist/`, pour rendre les liens de pages opérationnels.
