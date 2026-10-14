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
- `fact_mesures_plfss` : `effet` distingue économies, recettes, dépenses, transfert, objectif et solde. `montant_md` en Md€, année par ligne. Source : `PLFSS_2027_web.pdf`, publié par le ministère du Budget. Mesures non additives.
- Exécution des crédits du PLF : aucune série générale n’est présente ; ne pas assimiler ces crédits prévus à des dépenses exécutées.
- `fact_solde_apu` : solde net de financement des administrations publiques au sens EDP, AMECO, observations 1974–2024. Il ne représente pas le seul budget de l’État.
- `fact_solde_budget_general_etat` : solde exécuté du budget général de l’État, série mensuelle INSEE 001717255 ramenée à l’observation de décembre (cumul annuel), 2009–2025. Les comptes spéciaux sont publiés par une série distincte et 2026 reste incomplet.
- `fact_interets_apu` : dépenses d’intérêts des APU selon AMECO, premières observations disponibles en 1978. Une année absente reste absente, jamais convertie en zéro.
- `fact_encours_dette_apu` : encours consolidé brut des APU, série historique liée AMECO à partir de 1977. Il s’agit d’un stock, pas d’un remboursement annuel.
- `fact_financement_dette_etat` : exécution du tableau de financement AFT 2019–2024, curatée depuis le rapport de la Cour des comptes 2024. Principal amorti, intérêts, charge totale et émissions restent des catégories séparées. Les intérêts et la charge totale sont manquants pour 2019–2022 dans cette source.

AMECO est archivée dans `sources/ameco0_csv.zip` ; les séries curatées et leurs codes/version source sont sous `sources/`. Le rapport officiel de la Cour est archivé sous `sources/neb-2024-gestion-dette-tresorerie-etat.pdf`. `scripts/refresh_finances_publiques.py` rafraîchit ces sources ; `scripts/prepare_dashboard.py` les copie vers `data/staging/` et `public/data/` sans téléchargement. Les définitions et réserves sont détaillées dans [ADR-006](adr/006-solde-et-dette.md). Les crédits PLF 2027 sont des prévisions ; les liens de source pointent vers l’Assemblée nationale et le ministère du Budget.
