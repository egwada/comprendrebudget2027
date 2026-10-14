# Validation avec des citoyens — protocole à réaliser

**Statut : non réalisé.** Les tests automatisés ne remplacent pas des tests avec des personnes ne connaissant pas le vocabulaire budgétaire.

## Intitulés de la vue citoyenne (plan-comprehension-citoyenne.md)

Les libellés visibles ont été mis en œuvre dans `sqlrooms-dashboard/src/lib/labels.ts`. Points à vérifier en entretien :

- boutons de crédits : « Paiements que l’État prévoit de faire en 2027 (CP) » et « Dépenses que l’État peut engager (AE) » ;
- aide sigles visible sous les filtres (CP, AE, LFI, PLF, budget général) ;
- KPI : « Total des paiements prévus en 2027 », « Budget voté pour 2026 », « Ce qui change par rapport à 2026 », « Le domaine qui reçoit le plus de crédits » ;
- sections : « Les cinq domaines qui reçoivent le plus de crédits », « Sur 100 € de budget prévu, quelle part revient à chaque domaine ? », « Les domaines d’action de l’État, du plus financé au moins financé » ;
- fiche : « Que finance ce domaine ? », « Par rapport au budget voté en 2026 », « Actions financées dans ce domaine (programmes) » ;
- bouton « Voir les données détaillées » et lien « Comment les chiffres sont calculés ».

## Organisation

Recruter au moins cinq personnes non spécialistes, dont une sur mobile et une utilisant uniquement le clavier si possible. Expliquer que les montants du PLF sont des prévisions proposées au Parlement et non des dépenses exécutées, sans expliquer l’interface à l’avance. Ne collecter aucune donnée personnelle inutile.

Pour chaque tâche, noter : réponse, durée, chemin suivi, hésitations et besoin d’aide. Objectif produit : les quatre questions de première lecture doivent être résolues en moins d’une minute ; ne pas considérer cet objectif comme atteint sans observation.

## Tâches

1. Quel est le total prévu pour 2027 ? Quelle est la nature de ce montant (prévu ou déjà dépensé) ?
2. Quel domaine reçoit le plus de crédits ? Est-ce un service public directement financé ?
3. Combien est prévu pour l’enseignement scolaire ?
4. Ce montant augmente-t-il ou baisse-t-il depuis 2026 ? Le libellé le dit-il sans la couleur ni la flèche ?
5. Que peut-on voir en cliquant sur ce domaine ? Où trouve-t-on ses programmes et leur source ?
6. Pourquoi les 54 Md€ ne sont-ils pas la différence entre les crédits 2026 et 2027 ?
7. Peut-on additionner les lignes de mesures PLFSS ?
8. Après une recherche, à quel périmètre correspond le calcul pour 100 € ?
9. Quels mots restent incompris ou confus (budget général, CP/AE, PLF/PLFSS, crédits réellement dépensés) ? Relever chaque occurrence.

## Références pour l’observateur (CP, sans recherche)

- Total 2027 : 615,1 Md€ ; 2026 : 593,9 Md€ ; hausse : 21,2 Md€ (+3,6 %).
- Premier poste : remboursements et dégrèvements, 144,5 Md€, pas un service public direct.
- Enseignement scolaire : 90,9 Md€ (PDF PLF p. 308).
- Fiche mission : classement / carte / bouton « Voir les données détaillées » / bouton du tableau, retour « ← Retour à la liste des domaines » conservant la recherche.
- 54 Md€ : périmètre administrations publiques et trajectoire contrefactuelle ; ni variation du budget général, ni montant à ajouter.
- PLFSS : mesures documentées pouvant se recouper, sans total additionné.

## Audit manuel avant publication

Lecteur d’écran (NVDA/Firefox ou VoiceOver/Safari), zoom navigateur natif 200 %, mobile réel, clavier complet, cohérence de lecture des tableaux et liens PDF, compréhension du mode AE, authentification et droits des sources. Publier ensuite les résultats et les réserves ; ne pas annoncer de conformité RGAA sur la seule base d’axe-core.
