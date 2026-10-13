# Feuille de route — Tableau de bord budgétaire citoyen

**Statut** : plan de travail à reprendre lors de la prochaine session  
**Dernière mise à jour** : 2026-10-14  
**Dernier état fonctionnel validé** : commit `95ca773` — 38/38 contrôles headless PASS

## Objectif produit

Permettre à un citoyen de répondre en moins d'une minute à quatre questions :

1. Combien l'État prévoit-il de dépenser en 2027 ?
2. Quels sont les principaux postes de dépenses ?
3. Comment ces montants évoluent-ils par rapport à 2026 ?
4. Que finance concrètement une mission donnée ?

Principe directeur :

> Première lecture simple, deuxième clic explicatif, troisième niveau technique.

Le tableau de bord doit rester utile aux journalistes, associations, chercheurs et agents publics, sans imposer le vocabulaire budgétaire aux citoyens.

---

## État actuel et réserves connues

### Fonctionnalités présentes

- KPI CP et AE ;
- comparaison LFI 2026 / PLF 2027 ;
- treemap ;
- graphique comparatif ;
- classement des missions ;
- drill-down vers les programmes ;
- recherche et tri ;
- cartes de contexte du rapport général ;
- section mesures PLFSS ;
- sources et pages PDF ;
- validation headless reproductible dans `scripts/validate_headless.py`.

### Réserves de données à traiter en premier

- trois noms de missions tronqués par l'extraction PDF ;
- mission « Investir pour la France de 2030 » absente de la vue programmes ;
- environ 4 Md€ d'écarts entre totaux mission du PDF et sommes des programmes extraits ;
- les chiffres affichés sont des crédits prévus, pas des dépenses exécutées ;
- les 43/54 Md€ concernent un périmètre plus large que le budget général et ne doivent pas être additionnés aux crédits ;
- la ventilation exacte PLF / PLFSS des 43 Md€ n'est pas publiée dans les documents actuellement disponibles.

---

# Phase 0 — Périmètre et vocabulaire

## T0.1 — Définir les publics cibles

Documenter les besoins de trois profils :

- citoyen ;
- journaliste ou association ;
- utilisateur expert.

Pour chaque profil, préciser les questions principales et le niveau d'information affiché par défaut.

## T0.2 — Créer un glossaire budgétaire

Documenter en langage simple :

- crédits prévus ;
- crédits de paiement ;
- autorisations d'engagement ;
- mission ;
- programme ;
- LFI ;
- PLF ;
- dépenses exécutées ;
- mesures de redressement ;
- dépense sous norme.

Phrase obligatoire dans l'interface :

> Les montants présentés correspondent aux crédits prévus dans le PLF 2027. Ils ne représentent pas encore les dépenses effectivement réalisées.

**Livrable prévu** : `docs/glossaire-budget.md`

## T0.3 — Figer les périmètres

Distinguer explicitement :

- budget général ;
- administrations publiques ;
- PLFSS ;
- exécution budgétaire future.

Chaque chiffre affiché doit disposer d'une année, d'une unité, d'un périmètre et d'une source.

---

# Phase 1 — Fiabilisation des données

## T1.1 — Corriger les noms tronqués

Corriger `extract_budget.py` et rattacher les programmes aux libellés complets :

- `Administration générale et territoriale de l'État` ;
- `Gestion des finances publiques et lutte contre les fraudes` ;
- `Travail, emploi et administration des ministères sociaux`.

**Critères d'acceptation** : aucun nom tronqué dans l'interface ; les lignes programmes et total utilisent le même libellé.

## T1.2 — Restaurer « Investir pour la France de 2030 »

Retrouver les pages sources, extraire les programmes et vérifier le montant avec le total imprimé dans le PDF.

La mission doit apparaître dans les KPI, le classement et le drill-down.

## T1.3 — Utiliser les lignes `(total mission)` pour les agrégats mission

Décision recommandée :

- agrégats mission : lignes `(total mission)` ;
- détail programme : lignes programmes ;
- contrôle qualité : comparaison total mission / somme des programmes.

Les écarts doivent être affichés comme des alertes de qualité et non masqués.

## T1.4 — Formaliser le contrat de données

Ajouter ou documenter les champs :

```text
scope
annee
type_credit
mission
programme
montant
unite
source_document
source_page
qualite_extraction
```

Séparer strictement :

- `credits_prevus` ;
- `mesures_redressement` ;
- `objectif_depense` ;
- `solde_public`.

---

# Phase 2 — Vue citoyenne par défaut

## T2.1 — Repenser l'accueil

Titre cible :

> Où va l'argent prévu par l'État en 2027 ?

Afficher en premier :

- budget total prévu ;
- comparaison 2026/2027 ;
- cinq plus grands postes ;
- bouton « Explorer les missions » ;
- avertissement sur les crédits prévus.

## T2.2 — Faire du classement horizontal la vue principale

Le classement doit présenter les missions par montant, avec :

- nom complet ;
- montant ;
- part du total ;
- comparaison avec 2026 ;
- barre proportionnelle ;
- flèche et libellé hausse/baisse.

Le treemap devient une vue secondaire « Explorer ».

## T2.3 — Ajouter une lecture « pour 100 € »

Afficher la répartition des principaux postes sur 100 €, avec le périmètre explicite du calcul.

## T2.4 — Rendre les filtres toujours visibles

Créer une barre claire séparée du bandeau bleu :

- type de crédits ;
- recherche ;
- réinitialisation ;
- année ou périmètre si nécessaire.

Les filtres ne doivent pas dépendre d'un contraste subtil sur un fond coloré.

---

# Phase 3 — Navigation en trois niveaux

## T3.1 — Niveau global

L'utilisateur voit le budget total, les cinq principaux postes, l'évolution et l'accès aux missions.

## T3.2 — Fiche mission

Afficher :

- montant 2027 ;
- part du budget ;
- évolution depuis 2026 ;
- nombre de programmes ;
- classement des programmes ;
- sources PDF.

## T3.3 — Niveau expert

Conserver dans une vue avancée :

- CP / AE ;
- treemap ;
- données brutes ;
- export CSV ;
- SQL et références de pages ;
- alertes de qualité d'extraction.

---

# Phase 4 — 43 Md€ et 54 Md€

## T4.1 — Séparer les périmètres

Ne jamais additionner directement :

- crédits du budget général ;
- mesures PLFSS ;
- 43 Md€ de mesures 2027 ;
- 54 Md€ d'efforts ;
- objectifs de dépenses.

Les afficher dans des blocs distincts avec leur périmètre.

## T4.2 — Maintenir une explication explicite

Texte de référence :

> Les 43 Md€ concernent les textes financiers PLF + PLFSS. Les 54 Md€ agrègent un périmètre plus large et une trajectoire à politique inchangée. Ils ne correspondent pas à la variation des crédits du seul budget général entre 2026 et 2027.

## T4.3 — Ne pas additionner les mesures PLFSS

Les mesures PLFSS actuellement curatées peuvent se recouper. Les afficher comme mesures documentées, avec leurs pages et leurs réserves, mais sans produire de total artificiel.

Lorsque les rapports parlementaires publieront la ventilation PLF / PLFSS, ajouter les données correspondantes dans `dim_contexte` ou une table dédiée.

---

# Phase 5 — Accessibilité RGAA / WCAG

## T5.1 — Sémantique HTML

Utiliser une structure avec `header`, `main`, `nav`, `section`, titres hiérarchisés, boutons natifs et tableaux HTML accessibles.

## T5.2 — Clavier

Tester :

- tabulation ;
- focus visible ;
- activation Entrée/Espace ;
- tri des colonnes ;
- drill-down ;
- retour arrière.

## T5.3 — Ne pas dépendre des couleurs

Chaque couleur doit être accompagnée d'une flèche et d'un libellé :

- `↑ Hausse de 10,1 %` ;
- `↓ Baisse de 0,8 %`.

## T5.4 — Alternative aux graphiques

Chaque graphique doit disposer de :

- titre explicite ;
- résumé textuel ;
- tableau de données ;
- export CSV.

## T5.5 — Tests automatisés

Ajouter progressivement :

- axe-core ;
- contrôle des contrastes ;
- navigation clavier ;
- responsive mobile ;
- zoom 200 % ;
- `prefers-reduced-motion`.

---

# Phase 6 — Contenu éditorial

## T6.1 — Ajouter « À retenir »

Générer des synthèses comme :

> Les cinq premiers postes représentent X % des crédits affichés. La hausse globale est principalement liée à la charge de la dette et à la défense.

## T6.2 — Ajouter les définitions contextuelles

Chaque mission ou terme difficile doit disposer d'une explication courte et sourcée.

## T6.3 — Créer une page méthodologie

Documenter :

- sources ;
- LFI / PLF ;
- CP / AE ;
- budget général / sécurité sociale ;
- crédits prévus / dépenses exécutées ;
- limites de l'extraction PDF.

---

# Phase 7 — Tests et validation

## T7.1 — Tests de données

Tester :

- nombre de missions ;
- absence de noms tronqués ;
- présence d'Investir 2030 ;
- égalité ou écart total mission / programmes ;
- types numériques ;
- absence de doublons.

## T7.2 — Tests fonctionnels

Étendre `scripts/validate_headless.py` pour couvrir :

- CP / AE ;
- recherche ;
- réinitialisation ;
- tri ;
- drill-down ;
- export CSV ;
- clavier ;
- mobile ;
- section PLFSS ;
- cartes 43/54 Md€.

## T7.3 — Tests utilisateurs

Faire tester le prototype à des personnes ne connaissant pas le vocabulaire budgétaire.

Questions de validation :

1. Quel est le montant total prévu ?
2. Quel est le premier poste ?
3. Combien est prévu pour l'éducation ?
4. Quelle est l'évolution depuis 2026 ?
5. Où trouve-t-on le détail d'une mission ?
6. Quelle est la différence entre les 54 Md€ et les +21 Md€ ?

---

# Phasage d'implémentation recommandé

## Vertical slice 1 — « Où va l'argent ? »

1. Corriger les données mission ;
2. utiliser les lignes total mission ;
3. créer le classement horizontal ;
4. simplifier le vocabulaire ;
5. rendre les filtres visibles dans une barre blanche ;
6. conserver le tableau accessible ;
7. valider les KPI et les cinq premiers postes.

## Vertical slice 2 — « Que finance cette mission ? »

1. fiche mission ;
2. programmes ;
3. comparaison 2026/2027 ;
4. sources PDF ;
5. navigation retour ;
6. test clavier.

## Vertical slice 3 — « Comprendre les 54 Md€ »

1. séparation PLF / PLFSS ;
2. mesures PLFSS sans addition artificielle ;
3. méthodologie ;
4. réserve sur la ventilation exacte ;
5. intégration future des rapports parlementaires.

## Vertical slice 4 — « Accessibilité et publication »

1. audit RGAA/WCAG ;
2. responsive mobile ;
3. tableaux accessibles ;
4. export CSV ;
5. performance ;
6. documentation ;
7. déploiement public.

---

# Priorités

## P0 — Avant publication

- fiabiliser l'extraction ;
- clarifier crédits prévus / dépenses réalisées ;
- créer la vue citoyenne simple ;
- rendre les filtres visibles ;
- fournir une alternative tabulaire aux graphiques ;
- maintenir les sources et périmètres.

## P1 — Première version publique

- fiche mission ;
- vue pour 100 € ;
- mode expert ;
- accessibilité clavier et contraste ;
- export CSV ;
- tests utilisateurs.

## P2 — Évolutions futures

- données d'exécution budgétaire ;
- comparaison prévision / exécution ;
- historique pluriannuel ;
- ventilation officielle PLF / PLFSS ;
- déclinaisons territoriales ou par politique publique.

## Prochaine tâche recommandée

Commencer par **T1.1 à T1.3 — fiabilisation des agrégats et des libellés**, puis implémenter le Vertical Slice 1. Ne pas ajouter de nouveaux graphiques avant d'avoir sécurisé les chiffres affichés.
