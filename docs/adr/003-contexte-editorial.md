# ADR-003 : Faire apparaître les « 54 Md€ d'efforts » — chiffres de contexte éditoriaux curatés

## Statut

Accepté — 2026-10-14

## Contexte

Le tableau de bord est nourri exclusivement par le récapitulatif général des crédits
(pages 307-313 du PLF 2027, tome 1) : missions × programmes, LFI 2026 vs PLF 2027, AE/CP.
Les chiffres qui structurent le récit médiatique du PLF ne figurent dans **aucun tableau
budgétaire** de ce périmètre :

- **54 Md€** d'« efforts » au total (p. 12) ;
- **43 Md€** de mesures de redressement dans les textes financiers 2027 (PLF **+ PLFSS**) ;
- **511 Md€** de dépense totale sous norme / PDE (p. 13) ;
- **−5,0 pt de PIB** de solde public 2027 et **121,7 %** de dette (p. 12).

Deux de ces chiffres sont **structurellement incalculables depuis nos données** :
le PLFSS (sécurité sociale) n'est pas dans le tome 1, et la référence n'est pas la LFI
mais une trajectoire contrefactuelle « à politique inchangée » non publiée.

## Options considérées

1. **Calculer depuis les crédits extraits** — impossible (ci-dessus).
2. **Extraire automatiquement du texte du PDF** — regex sur du texte-flux, fragile,
   et pour ~6 chiffres stables le coût dépasse largement le bénéfice.
3. **Curater un petit dataset de contexte** — une ligne par chiffre, sourcée page par page. ✔

## Décision

Créer `data/staging/dim_contexte.csv` (colonnes : `cle, libelle, valeur, unite, annee,
perimetre, source_page, note`), copié dans `public/data/` du dashboard, chargé en table
DuckDB `dim_contexte` à côté de `fact_credits`. Le dashboard rend ces chiffres dans une
section dédiée « Les chiffres du rapport général », sous la note de lecture qui réconcilie
« +21 Md€ » (budget général, LFI→PLF) et « 54 Md€ » (administrations publiques, contrefactuel).

Le solde « montée en charge » (11 Md€) est **dérivé** (54 − 43) et marqué comme tel
dans la colonne `note`.

## Conséquences

- La distinction des périmètres est explicite dans l'UI (carte par carte : « Administrations
  publiques » vs « État »), ce qui renforce la note de lecture plutôt que de la contredire.
- Toute évolution du rapport général = une ligne de CSV à mettre à jour (traçable,
  page source incluse). Curation manuelle : risque d'obsolescence assumé et documenté.
- Extensible sans coût : ajouter un chiffre (croissance, inflation, déficit 2026…) = une ligne.