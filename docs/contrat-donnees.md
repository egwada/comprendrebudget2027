# Contrat de données — dashboard citoyen

## `fact_credits`

Clé unique : `(scope, mission, programme, type_credit, annee)` pour ce récapitulatif.

| Champ | Contrat |
|---|---|
| scope | `budget_general` |
| nature | `credits_prevus` |
| annee | entier : 2026 (LFI) ou 2027 (PLF) |
| type_credit | `CP` ou `AE`, jamais additionnés |
| mission / programme | libellé complet ; `(total mission)` réservé à la ligne imprimée du PDF |
| montant | entier non négatif, en euros |
| unite | `EUR` |
| source_document | `l17b3210_projet-loi.pdf` |
| source_page | page PDF, base 1 |
| qualite_extraction | `extrait_pdf` ou `cellules_vides_zero` |
| titre | `Récapitulatif général` |

Les cellules vides du tableau correspondent à l’absence de crédits dans l’année/type concerné : zéro conservé avec marqueur de qualité. Ce choix est spécifique à ce PDF et contrôlé par la réconciliation des quatre colonnes.

**Agrégats** : somme des lignes `(total mission)` exclusivement. **Détails** : lignes programmes exclusivement. `v_qualite` expose, par mission/type/année, total imprimé, somme des programmes et écart signé. Un écart non nul ne remplace jamais le total imprimé et doit rester visible.

## Autres natures

- `dim_contexte` : chiffres curatés avec année, unité, périmètre, page, note. Nature documentée par clé : efforts/mesures = `mesures_redressement`, PDE = `objectif_depense`, déficit = `solde_public`, dette = `dette_publique`. Le solde 54 − 43 est explicitement dérivé.
- `fact_mesures_plfss` : `effet` distingue économies, recettes, dépenses, transfert, objectif et solde. `montant_md` en Md€, année par ligne. Source : `plfss_2027_texte.pdf`. Mesures non additives.
- Exécution budgétaire : aucune donnée présente ; ne pas assimiler aux crédits prévus.

Les fichiers curatés sont versionnés sous `sources/`. `data/` et `public/data/` sont reconstruits par `scripts/prepare_dashboard.py`. Les PDF locaux ne sont pas versionnés. Source de démonstration, non officielle (ADR-001).
