# ADR-005 — Agrégats mission et lecture citoyenne

Statut : accepté — implémentation de la feuille de route citoyenne.

## Décision

Le total affiché est la somme des **totaux mission imprimés** dans le récapitulatif du PDF (p. 307–313), pour un seul type de crédits et une année. Les programmes servent au détail et à la réconciliation, pas au calcul des KPI. Ce choix remplace la somme des programmes utilisée initialement (ADR-002).

L’extraction utilise les positions des quatre en-têtes sur chaque page. Les cellules vides sont conservées comme zéros signalés. Les continuations sont assemblées immédiatement (espacement vertical), en mettant à jour la mission courante avant d’attribuer les programmes. La mission Investir 2030 traverse les pages 309–310 sans perdre ses programmes.

## Résultat contrôlé

32 missions et 135 programmes/dotations, y compris les lignes sans crédits. Les quatre colonnes de chaque mission réconcilient exactement avec leurs programmes sur le PDF actuel ; les futurs écarts seront exposés, non corrigés artificiellement.

## Lecture et limites

La vue citoyenne présente les CP par défaut, un classement horizontal et une table accessible. Le treemap est secondaire. Les crédits sont bruts : les remboursements et dégrèvements constituent le premier poste et ne sont pas un financement de services publics. Les parts et la lecture pour 100 € utilisent explicitement ce même dénominateur, filtré si une recherche est active.

Le PDF PLF 2027 est fictif / simulé (ADR-001). L’interface doit annoncer cette limite avant toute publication ; ne pas le présenter comme un document officiel réel.
