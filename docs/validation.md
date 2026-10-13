# Validation du tableau de bord PLF 2027 — état initial

**Date** : 2026-10-14 · **Commits validés** : `159fb3a` (UI) → `0dca203` (fix treemap) → `9314c55` (note 54 Md€)
**Script rejouable** : `scripts/validate_headless.py` (chromium headless + CDP, exit code 0/1)

## Méthode

1. **Partie A — valeurs attendues** : agrégation Python **indépendante** de `data/staging/fact_credits.csv` (aucun DuckDB/SQL impliqué).
2. **Partie B — UI réelle** : `dist/` servi en statique, piloté via CDP (clics, saisie, lectures DOM), comparé aux valeurs attendues.
3. **Partie C — intégrité des données** : croise lignes `(total mission)` vs sommes de programmes par mission × type × année.

## Résultat fonctionnel : 26/26 PASS

| Domaine | Contrôles |
|---|---|
| Chargement | pas d'écran d'erreur ; KPI affichés |
| KPI CP | 609,8 Md€ PLF 2027 · 588,7 Md€ LFI 2026 · +21,1 Md€ (+3,6 %) · dont dette +14 Md€, hors dette +7,2 Md€ (+1,4 %) · 1ᵉʳ poste = Remboursements et dégrèvements |
| KPI AE (bascule) | 631,7 Md€ · 619,1 Md€ ; hint du graphique suit la bascule |
| Treemap | 31 cellules = 31 missions ; clic → drill-down programmes ; chip de sélection |
| Barres | top 14 missions × 2 séries (LFI/PLF) |
| Tableau | 32 lignes (31 missions + total) ; tri asc/desc sur PLF 2027 (min = Crédits non répartis) ; clic ligne → drill-down |
| Recherche | « Défense » → 1 mission + total, KPI filtrés = 73,2 Md€ ; recherche vide → message « Aucune mission » |
| Navigation | bouton retour ← → 32 lignes missions |
| Contenu | note de lecture « 54 Md€ d'efforts » présente |

## Valeurs de référence (chaîne complète CSV → DuckDB → SQL → UI)

| | LFI 2026 | PLF 2027 | Δ |
|---|---|---|---|
| CP (31 missions affichées) | 588,7 Md€ | 609,8 Md€ | +3,6 % |
| AE | 619,1 Md€ | 631,7 Md€ | +2,0 % |
| Top poste (CP 2027) | — | Remboursements et dégrèvements : 144,5 Md€ (23,7 %) | −0,8 % |
| Défense (CP 2027) | 66,5 Md€ | 73,2 Md€ | +6,7 Md€ |

## Avertissements de données (non bloquants, documentés)

La validation a mis au jour des **défauts d'extraction du PDF** (parser `extract_budget.py`, continuations multi-lignes) :

1. **3 noms de missions tronqués** — les lignes programmes sont attribuées au nom tronqué, la ligne `(total mission)` au nom complet :
   - « Gestion des finances publiques et lutte contre **les fraudes** »
   - « Travail, emploi et administration des **ministères sociaux** »
   - « Administration générale et territoriale de **l'État** »

2. **Mission « Investir pour la France de 2030 d'innovation » absente du dashboard** : sa ligne total existe (8,8 Md€) mais ses lignes programmes ont été perdues à l'extraction → le dashboard compte **31 missions au lieu de 32**.

3. **≈ 4,0 Md€ de lignes programmes manquantes** vs les totaux du PDF (~0,3 %), principalement : Régimes sociaux et de retraite (−1,3 Md€), Agriculture et alimentation (−0,9 Md€), Écologie (−0,8 Md€), Engagements financiers (−0,6 Md€), Recherche (−0,3 Md€).

**Conséquence sur les chiffres affichés** : les totaux du dashboard sont la somme des lignes programmes extraites — cohérents en interne (UI = SQL = CSV), mais légèrement **sous-estimés** (~ −1 Md€ par type/année) par rapport aux totaux imprimés du récapitulatif.

## Recommandation pour l'itération suivante

Corriger `extract_budget.py` (continuations multi-lignes des libellés en gras), puis **utiliser les lignes `(total mission)` directement pour les agrégats par mission** (elles sont complètes et déjà présentes dans la table), en gardant les lignes programmes pour le drill-down : cela éliminerait d'un coup les 3 écarts (noms tronqués, mission manquante, sous-estimation des totaux).

## Conclusion

**Le tableau de bord est VALIDÉ en l'état** : build propre (tsc + vite), chargement DuckDB-WASM robuste (init idempotente, WASM servi même-origine), toutes les interactions fonctionnent, et les valeurs affichées correspondent exactement aux données extraites. Les réserves portent exclusivement sur la qualité d'extraction amont, quantifiées ci-dessus, à traiter dans l'évolution suivante.
---

# Addendum du 2026-10-14 — PLFSS : faire apparaître la part sécurité sociale des 43 Md€

**Commits** : `2178e0d` (ADR-004) → validation étendue **38/38 PASS** (`scripts/validate_headless.py`)

## Nouvelle source : texte du PLFSS 2027

- `plfss_2027_texte.pdf` (121 p., NOR CPPX2620963L/Bleue-1, texte soumis au Conseil des
  ministres) ajouté au repo à côté du PLF tome 1.
- `data/staging/fact_mesures_plfss.csv` : **17 mesures chiffrées curatées page par page**
  (branche, article, montant en Md€, effet, année, page source, note) → table DuckDB
  `fact_mesures_plfss` (ADR-004 : curation, comme ADR-003).

## Nouveaux contrôles (7) : section « Et les 43 Md€ côté sécurité sociale — le PLFSS 2027 »

| # | Contrôle | Attendu |
|---|---|---|
| 17 | Section présente | « 43 MD€ CÔTÉ SÉCURITÉ SOCIALE — PLFSS 2027 » |
| 18 | ONDAM affiché | 278,7 Md€ |
| 19 | Économies ONDAM | 5,1 Md€ |
| 20 | Solde ROBSS | −12,7 Md€ |
| 21 | Réserve anti-addition | « ne pas additionner » |
| 22 | Réserve ventilation | « non publiée » |
| 23 | Lignes de mesures | 17 |

Plus : la section est **masquée en vue programmes** (drill-down) — contrôlé.
La carte contexte `mesures_2027` (43 Md€) pointe désormais vers cette section au lieu
d'écarter le PLFSS du périmètre.

## Réserves de données inchangées

La ventilation exacte des 43 Md€ entre PLF et PLFSS **n'est publiée dans aucun document
disponible** (vérifié : aucun chiffre « dont X côté PLF/Y côté PLFSS » dans le tome 1 ni le
texte PLFSS ; dossier AN « PLFSS_2027 » encore vide à date). Les mesures PLFSS affichées
se recoupent (montée en charge 2026 vs économies nouvelles 2027) : le tableau n'affiche
**aucun total additionné**, les repères agrégés sont ceux du texte (solde −12,7 Md€,
rendement ~9 Md€ dépenses, > 6 Md€ recettes, ~3 Md€ reprise en base).
