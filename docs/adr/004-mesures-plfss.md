# ADR-004 : Mesures de redressement côté sécurité sociale — extraction PLFSS 2027

## Statut

Accepté — 2026-10-14

## Contexte

Le rapport général du PLF (tome 1, notre source) chiffre les efforts de redressement **sans ventiler**
les **43 Md€ de mesures 2027** entre le PLF (budget de l'État) et le PLFSS (sécurité sociale) :
vérifié par balayage du texte — aucune phrase « dont X côté PLF / Y côté PLFSS ». La ventilation
exacte n'est publiée nulle part dans les documents disponibles ; elle sera chiffrée par les rapports
parlementaires (dossier AN « PLFSS_2027 », encore vide au 2026-10-14).

Le **texte du PLFSS 2027** (version soumise au Conseil des ministres, NOR CPPX2620963L/Bleue-1,
121 p. — copie locale `plfss_2027_texte.pdf`) contient en revanche les mesures chiffrées,
dispersées en prose dans les exposés des motifs et articles (p. 106-121).

## Décision

Comme pour ADR-003 (54 Md€) : **curation sourcée page par page** d'un dataset
`data/staging/fact_mesures_plfss.csv` (branche, article, intitulé, montant en Md€, effet
[économies / recettes / dépenses / solde / objectif / transfert], année, page source, note),
chargé en table DuckDB `fact_mesures_plfss` à côté de `fact_credits` et `dim_contexte`.

Le dashboard expose une section « Mesures de redressement — sécurité sociale (PLFSS 2027) »
qui regroupe ces mesures par effet, **en vue de ce qui compose la part PLFSS des 43 Md€**, avec
la réserve explicite : la ventilation PLF/PLFSS n'est pas publiée dans les documents disponibles.

## Limites assumées

1. **Périmètre du texte bleu** : le texte soumis au Conseil des ministres ne contient pas les
   annexes détaillées (tableau complet des mesures par article) ; certaines mesures sont des
   ordres de grandeur en prose (« environ », « plus de ») — fidélité au texte, note dans le CSV.
2. **Pas d'addition naïve** : les mesures se recoupent (montée en charge réglementaire 2026 vs
   économies nouvelles 2027 ; revalorisation différenciée ⊂ rendement des mesures de dépenses).
   L'UI n'affiche **pas de total additionné** des lignes mesures ; elle met en avant le solde
   ROBSS (−12,7 Md€, +9,1 Md€ d'amélioration vs 2026) et le rendement des mesures (~9 Md€ en
   dépenses, +6 Md€ en recettes, ~3 Md€ de reprise en base), tels que publiés.
3. **Dérivés marqués** : solde ROBSS 2026 (−21,8 Md€) est dérivé (−12,7 − 9,1), en note seulement.

## Conséquences

- Le dashboard « voit » enfin la partie sécurité sociale des efforts, à côté des crédits du
  budget général — sans contredire la note de lecture (périmètres distincts affichés).
- Mise à jour facile quand les rapports AN/Sénat publieront la ventilation : ajouter les lignes
  correspondantes au CSV (et éventuellement une carte `ventilation_plf_plfss` dans dim_contexte).