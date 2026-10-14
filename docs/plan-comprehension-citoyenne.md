# Plan — mieux accompagner la compréhension citoyenne

**Branche** : `feat/citoyen-05-comprehension-intitules`  
**Statut** : plan à mettre en œuvre  
**Périmètre** : vue citoyenne du dashboard, sans modification des données ni des intitulés officiels des sources

## Objectif

Permettre à une personne qui ne connaît pas le vocabulaire budgétaire de comprendre, dès la première lecture :

1. ce que mesure chaque chiffre ;
2. à quoi correspond chaque rubrique ;
3. ce qui augmente ou diminue entre 2026 et 2027 ;
4. ce qu'elle peut apprendre en cliquant sur une mission.

La règle éditoriale est : **un intitulé courant en premier, le terme budgétaire précis ensuite**. Les acronymes restent utiles pour les personnes expertes, mais ne doivent jamais être nécessaires pour comprendre la vue par défaut.

## Constat de départ

Les données sont fiables et les réserves sont documentées, mais plusieurs intitulés demandent une connaissance préalable :

- `CP`, `AE`, `LFI` et `PLF` apparaissent dans les contrôles et les colonnes ;
- `mission`, `programme`, `part`, `crédits bruts` et `budget général` ne sont pas immédiatement parlants ;
- `Classement des missions`, `Premier poste` et `Pour 100 € de crédits prévus` décrivent correctement le calcul, mais moins directement la question que se pose un citoyen ;
- `Vue experte` et `Mesures PLFSS` annoncent un niveau technique sans expliquer ce que la personne va trouver.

Les intitulés officiels des missions et programmes doivent rester inchangés dans les données et les sources. L'amélioration porte sur les titres, les libellés d'interface et les explications associées.

## Vocabulaire cible

| Intitulé actuel | Intitulé proposé | Explication secondaire à afficher |
|---|---|---|
| `Paiements prévus (CP)` | `Paiements que l'État prévoit de faire en 2027` | `CP` — paiements pouvant être effectués pendant l'année |
| `Engagements autorisés (AE)` | `Dépenses que l'État peut engager` | `AE` — engagements pouvant produire des paiements sur plusieurs années |
| `Budget total prévu — CP 2027` | `Total des paiements prévus en 2027` | Budget général, remboursements et dégrèvements compris |
| `Crédits votés — LFI 2026` | `Budget voté pour 2026` | `LFI` signifie loi de finances initiale |
| `Évolution depuis 2026` | `Ce qui change par rapport à 2026` | Montant et pourcentage d'augmentation ou de baisse |
| `Premier poste` | `Le domaine qui reçoit le plus de crédits` | Montant prévu en 2027 |
| `Les cinq principaux postes` | `Les cinq domaines qui reçoivent le plus de crédits` | Classement selon les montants prévus en 2027 |
| `Pour 100 € de crédits prévus` | `Sur 100 € de budget prévu, quelle part revient à chaque domaine ?` | Cette répartition ne correspond pas à l'usage individuel des impôts |
| `Classement des missions` | `Les domaines d'action de l'État, du plus financé au moins financé` | Terme budgétaire : une mission regroupe plusieurs programmes |
| `Mission` | `Domaine d'action de l'État` | Le mot officiel `mission` est conservé entre parenthèses dans le détail |
| `Programme` | `Action financée dans ce domaine` | Terme budgétaire : regroupement d'actions et de moyens |
| `Part` | `Part du budget affiché` | Pourcentage du total actuellement affiché |
| `Évolution` | `Par rapport à 2026` | Comparaison entre le budget voté en 2026 et le projet pour 2027 |
| `Vue experte` | `Voir les données détaillées` | Graphiques, lignes sources, contrôles qualité et requêtes |
| `Méthodologie et glossaire` | `Comment les chiffres sont calculés` | Définitions, sources, périmètres et limites |
| `Mesures PLFSS` | `Mesures prévues pour la Sécurité sociale` | Le `PLFSS` est un texte distinct du budget général de l'État |

## Principes de rédaction

- Employer un verbe ou une question quand cela aide la lecture : `Que finance ce domaine ?`, `Ce qui change par rapport à 2026`.
- Développer un acronyme à sa première apparition dans chaque zone de lecture ; conserver l'acronyme entre parenthèses pour la précision.
- Ne pas remplacer les libellés officiels des missions et programmes : ajouter une formulation explicative autour d'eux.
- Éviter les promesses que les données ne permettent pas de vérifier : préférer `crédits prévus` à `dépenses` et `domaines financés` à `services rendus`.
- Placer l'explication juste après le titre ou le contrôle concerné, plutôt que de renvoyer systématiquement au glossaire.
- Réserver le vocabulaire technique détaillé à la vue experte, à la méthodologie et aux attributs d'aide accessibles.

## Découpage de mise en œuvre

### 1. Inventaire et dictionnaire d'interface

- Centraliser les libellés de la vue citoyenne dans un dictionnaire éditorial typé, afin d'éviter les variantes entre `Dashboard`, `RankingTable`, `MissionDetail` et `BudgetContext`.
- Recenser les textes visibles, les `aria-label`, les légendes de graphiques, les messages d'état et les exports.
- Identifier les libellés qui doivent rester strictement conformes au document source.

### 2. Accueil et filtres

- Reprendre les titres KPI, les boutons CP/AE, la recherche et le lien méthodologie selon le vocabulaire cible.
- Ajouter une aide courte et visible pour `CP`, `AE`, `LFI`, `PLF` et `budget général`.
- Reformuler le sous-titre d'accueil comme une question citoyenne, sans retirer le périmètre ni l'avertissement sur les crédits prévus.

### 3. Classement et répartition

- Reformuler les titres du top 5, du classement, de la répartition pour 100 € et des colonnes.
- Donner à chaque hausse ou baisse un libellé explicite, par exemple `+ 2,1 Md€ — hausse par rapport à 2026`, au-delà de la seule flèche ou couleur.
- Remplacer les explications techniques de la barre par une phrase compréhensible, tout en conservant l'information sur le total de référence.

### 4. Fiche d'un domaine

- Présenter la fiche comme `Que finance ce domaine ?` puis afficher le nom officiel de la mission.
- Remplacer `Programmes / dotations` par une formulation expliquant ce que représentent les lignes affichées.
- Conserver la réserve : les intitulés décrivent les crédits et ne permettent pas d'évaluer les résultats des politiques publiques.
- Renommer l'action de retour et l'export pour qu'ils indiquent clairement ce qui sera retrouvé ou téléchargé.

### 5. Contexte, expertise et qualité

- Reformuler les titres des cartes 43/54 Md€ en distinguant explicitement `périmètre` et `montant`.
- Rendre visible, au moment de l'affichage, que les chiffres de contexte ne s'ajoutent pas au budget général.
- Conserver les termes techniques dans la vue détaillée, mais les accompagner d'une phrase répondant à `à quoi cela sert ?`.
- Ne pas simplifier les alertes de qualité au point de masquer l'écart entre le total imprimé et les programmes extraits.

### 6. Validation avec des citoyens

- Mettre à jour `docs/tests-utilisateurs-dashboard.md` avec les nouveaux intitulés.
- Tester au moins cinq personnes non spécialistes, dont une sur mobile si possible.
- Mesurer si la personne peut répondre sans aide à :
  - `Quel est le total prévu pour 2027 ?` ;
  - `Quel domaine reçoit le plus de crédits ?` ;
  - `Ce montant augmente-t-il ou baisse-t-il depuis 2026 ?` ;
  - `Que peut-on voir en cliquant sur ce domaine ?`.
- Relever les mots incompris et les confusions entre budget général, CP/AE, PLF/PLFSS et crédits réellement dépensés.

## Critères d'acceptation

- Un utilisateur non spécialiste comprend le rôle de chaque bloc de la page d'accueil sans ouvrir le glossaire.
- Aucun acronyme présent dans la vue citoyenne n'est utilisé sans développement ou explication immédiate.
- Les noms officiels issus du PDF, les montants, les années, les périmètres, les sources et les exports restent inchangés.
- Une hausse, une baisse ou une stabilité est compréhensible sans dépendre de la couleur, de la flèche ou d'un symbole.
- Les noms accessibles (`aria-label`, titres de région, messages de statut) utilisent le même vocabulaire que les intitulés visibles.
- Les tests headless, les tests de données et l'audit axe-core restent verts.
- Les tests utilisateurs permettent de vérifier l'objectif de première lecture en moins d'une minute ; cet objectif ne doit pas être déclaré atteint avant ces observations.

## Hors périmètre

- Renommer les missions ou programmes dans les données officielles.
- Déduire l'usage individuel des impôts à partir de la répartition pour 100 €.
- Présenter les crédits prévus comme des dépenses exécutées.
- Additionner les 43/54 Md€ de contexte aux crédits du budget général.
- Modifier le périmètre PLFSS ou inventer une ventilation absente des sources.
