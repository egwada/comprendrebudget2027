# État du projet — Point de repère

> Document généré automatiquement le 2025-01-14.
> Branche active : `feat/citoyen-05-comprehension-intitules`
> Dernier commit : `763ef01` — "feat(citoyen): reformuler les intitulés pour la première lecture"
> Arbre de travail : propre (rien à valider)

---

## 1. Vision produit

Tableau de bord budgétaire citoyen autour du PLF 2027 et du PLFSS.

Objectif : permettre à un citoyen de répondre en **moins d'une minute** à 4 questions :
1. Combien l'État prévoit-il de dépenser en 2027 ?
2. Quels sont les principaux postes de dépenses ?
3. Comment ces montants évoluent-ils par rapport à 2026 ?
4. Que finance concrètement une mission donnée ?

Principe directeur : première lecture simple, deuxième clic explicatif, troisième niveau technique.

---

## 2. Stack technique

| Couche | Technologie |
|--------|-------------|
| Extraction ETL | Python 3, `pdfplumber`, CSV, DuckDB |
| Dashboard | React 19, TypeScript, Vite, DuckDB-WASM, Recharts |
| Tests | Node test runner, Python scripts, axe-core, Chromium headless (CDP) |

---

## 3. Pipeline données

```
PDFs sources
    ↓ (extract_budget.py)
data/raw/raw_credits.csv
    ↓ (transformation Python)
data/staging/{dim_mission.csv, dim_contexte.csv, fact_credits.csv, fact_mesures_plfss.csv}
    ↓ (prepare_dashboard.py)
sqlrooms-dashboard/public/data/ + public/sources/
    ↓ (vite build)
sqlrooms-dashboard/dist/ (build statique prêt à servir)
```

**Empreintes PDF (SHA-256)** :
- PLF : `132274b83bed4861a9e1a147d0d16abda2d729cdad2373ef804e26747c43d881`
- PLFSS : `71010873c0af8a776436e3c22628d3a1dc048ea406632afa2107dc83be7c598d`

---

## 4. Chiffres clés validés (budget général brut)

| Indicateur | LFI 2026 | PLF 2027 | Évolution |
|------------|----------|----------|-----------|
| CP | 593 890 071 649 € | 615 139 875 333 € | +21,2 Md€ (+3,6 %) |
| AE | 620 249 232 626 € | 632 868 821 128 € | +12,6 Md€ |
| Missions | 32 | 32 | — |
| Programmes/dotations | 135 | 135 | — |
| Faits | — | — | 668 |

- Premier poste CP 2027 : Remboursements et dégrèvements = 144,5 Md€
- Investir pour la France de 2030 : 3 999 870 000 € CP 2027 (pages 309–310)
- Les totaux mission imprimés réconcilient avec les sommes des programmes dans les 4 colonnes (aucun écart actuel ; mécanisme d'alerte validé par injection)

**Réserve critique** : le PLF utilisé est un document **fictif / simulé** (ADR-001). Aucun budget officiel réel ne peut être déduit de cette démonstration.

---

## 5. Validation actuelle

| Type | Résultat |
|------|----------|
| Contrôles headless (81 scénarios UI réelle) | ✅ 81/81 PASS |
| Tests de données cohérence Python | ✅ 5/5 PASS |
| Tests unitaires Node | ✅ 5/5 PASS |
| Lint (oxlint) | ✅ PASS sans avertissement |
| Build statique | ✅ OK |
| Régression (injection écart 1 M€) | ✅ Détectée sans corruption des KPI |

---

## 6. Fonctionnalités implémentées

- [x] KPI CP/AE 2026/2027 avec delta
- [x] Repères de variation en couleurs neutres, sans associer hausse ou baisse à un jugement de valeur
- [x] Vue citoyenne (5 postes, "pour 100 €")
- [x] Intitulés et explications reformulés pour guider la lecture citoyenne, sans modifier les noms officiels ni les chiffres sources
- [x] Tableau des 32 missions (tri, recherche, réinitialisation, `aria-sort`)
- [x] Treemap interactive
- [x] Graphique comparatif barres
- [x] Fiche mission avec drill-down programmes (Investir 2030 complet)
- [x] Section Mesures PLFSS (17 mesures, 278,7 / 5,1 / −12,7 Md€)
- [x] Contexte éditorial (43/54 Md€ distincts, non-additifs)
- [x] Exports CSV sourcés (classement, programmes, brut, contexte, PLFSS)
- [x] Navigation clavier (Entrée/Espace/Tab), focus restauré, retour navigateur
- [x] Accessibilité axe-core (5 audits sans violation détectée)
- [x] Mobile 375 px sans débordement, zoom CSS 200 %, reduced-motion
- [x] Méthodologie et glossaire budgétaire
- [x] Sources PDF servies avec type MIME correct et liens de page

---

## 7. Travaux réalisés (phases roadmap)

| Phase | État |
|-------|------|
| Phase 0 — Périmètre et vocabulaire | ✅ Terminé |
| Phase 1 — Fiabilisation des données | ✅ Terminé |
| Phase 2 — Vues citoyennes et expert | ✅ Terminé |
| Phase 3 — Agrégats, contexte, PLFSS | ✅ Terminé |
| Phase 4 — Exports, accessibilité, tests | ✅ Terminé |
| Phase 5 — Publication et tests utilisateurs | ⏳ Non démarré |

---

## 8. Blocages et réserves connues

| Problème | Gravité | Statut |
|----------|---------|--------|
| Tests utilisateurs réels non réalisés | Moyenne | À planifier — protocole prêt dans `docs/tests-utilisateurs-dashboard.md` |
| Audit lecteur d'écran / mobile réel non fait | Moyenne | Complémentaire à axe-core |
| Aucun déploiement distant configuré | Moyenne | Build statique prêt (`dist/`), cible d'hébergement à choisir |
| WASM DuckDB ~35 Mo au premier chargement | Faible | À mesurer sur connexion lente avant publication grande audience |
| PLF fictif / simulé | Information | Mentionné explicitement dans l'interface et les docs |

---

## 9. Prochaines étapes possibles

1. **Déployer** le build statique (GitHub Pages, Netlify, S3, etc.)
2. **Réaliser des tests utilisateurs** selon le protocole documenté
3. **Auditer l'accessibilité** avec lecteur d'écran et mobile réel
4. **Mesurer les performances** sur connexion lente (chargement WASM)
5. **Poursuivre la roadmap** (phase 5 : publication, communication, maintenance)

---

## 10. Commandes de référence

```bash
# Rejouer la validation complète
cd sqlrooms-dashboard
npm ci
npm run prepare:data
npm test
npm run test:data
npm run lint
npm run build:publication
npm run test:headless

# Alternative port si 8901 occupé
python3 ../scripts/validate_headless.py --port 8928
```

---

## 11. Fichiers clés

| Fichier | Rôle |
|---------|------|
| `extract_budget.py` | Extraction déterministe des PDFs |
| `scripts/prepare_dashboard.py` | Préparation des données pour le build |
| `scripts/test_data.py` | Tests de cohérence Python |
| `scripts/validate_headless.py` | Validation UI headless (Chromium CDP) |
| `sqlrooms-dashboard/src/App.tsx` | Application React principale |
| `docs/roadmap-dashboard-citoyen.md` | Feuille de route détaillée |
| `docs/validation.md` | Rapport de validation |
| `docs/contrat-donnees.md` | Contrat qualité données |
| `docs/adr/001-extraction-pdf.md` | ADR extraction |
| `docs/adr/005-agregats-citoyens.md` | ADR agrégats |

---

*Ce document sert de point d'ancrage pour reprendre le projet ultérieurement.*
