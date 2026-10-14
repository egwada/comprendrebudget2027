# ADR 001 : Extraction des données budgétaires depuis le PDF du PLF 2027

**Statut** : Accepted

## Contexte

Le projet utilise le PDF de 349 pages du projet de loi de finances pour 2027, publié sur le site de l'Assemblée nationale, comme source des crédits budgétaires. La copie utilisée pour l'extraction est `l17b3210_projet-loi.pdf` ; la [publication officielle de l’Assemblée nationale](https://www.assemblee-nationale.fr/dyn/17/textes/l17b3210-projet-loi.pdf) est la référence publique. Le texte est natif (pas scanné), mais les tableaux sont présentés en texte aligné plutôt qu'en cellules PDF formelles.

Aucun dataset structuré correspondant au PLF 2027 n'existe sur data.gouv.fr ni sur data.economie.gouv.fr (seules les LFI 2012–2013 et suivantes sont publiées en open data, et avec retard). Le PDF est donc la source de vérité obligée.

Les données cibles sont les **crédits par mission et programme** :
- Autorisations d'engagement (AE)
- Crédits de paiement (CP)
- Comparaison LFI 2026 vs PLF 2027

### Exploration technique

L'analyse du PDF avec `pdfplumber` montre que :
- Les pages ~307–341 contiennent les tableaux budgétaires par mission et programme.
- `pdfplumber.find_tables()` ne détecte que les lignes d'en-tête (2–3 lignes) mais pas les données, car celles-ci sont en **texte continu avec tabulations implicites** (espaces alignés), pas dans des cellules PDF formelles.
- Les pages ~245–254 contiennent des tableaux comparatifs avec la même structure.

## Décision

**On utilise `pdfplumber` en mode extraction de texte + parsing scripté (Python + regex), à partir du PDF publié par l’Assemblée nationale.**

### Détails de la décision

1. **Outil principal** : `pdfplumber` (déjà disponible dans l'environnement).
   - `page.extract_text()` pour récupérer le texte brut par page.
   - Parsing post-traitement avec regex pour identifier :
     - les titres de mission (lignes sans montant, souvent en gras ou majuscule dans le texte),
     - les programmes (lignes indentées avec 4 montants : AE LFI 2026, AE PLF 2027, CP LFI 2026, CP PLF 2027),
     - les montants numériques (en euros, sans séparateur de milliers ou avec espace).

2. **Pas de Camelot / tabula-py** : ces outils sont optimisés pour les vrais tableaux PDF (lignes de grille). Ici, la structure est textuelle ; leur taux de rappel serait faible.

3. **Pas d'OCR** : le texte est déjà sélectionnable, l'OCR ajouterait du bruit sans bénéfice.

4. **Pas d'extraction LLM** : pour garantir la reproductibilité, la traçabilité des chiffres et la rapidité. Un LLM pourrait interpréter des montants ou des fusions de cellules de manière non déterministe.

5. **Format de sortie** : fichier CSV ou Parquet structuré (`raw_credits.csv`) avec les colonnes suivantes :
   - `titre` (ex. "Titre 1. Dotations des pouvoirs publics")
   - `mission`
   - `programme`
   - `type_credit` (`AE` ou `CP`)
   - `annee` (`2026` ou `2027`)
   - `montant` (entier, en euros)
   - `source_page` (numéro de page dans le PDF, pour audit)

6. **Validation** : comparaison des totaux extraits avec les totaux annoncés dans l'exposé général du PDF (pages 9–10, "Équilibre budgétaire"). Si l'écart > 0,1 %, relire les pages problématiques manuellement.

## Conséquences

### Positives

- **Traçabilité totale** : chaque montant est rattaché à une page du PDF source.
- **Pas de dépendance externe** : pas besoin d'API, d'Internet ou de modèle LLM pour l'extraction.
- **Léger** : le script Python s'exécute en quelques secondes.

### Négatives

- **Fragilité au format** : si le PDF change de mise en page (fonte, espacement), le regex doit être adapté. Le script est spécifique au PLF 2027.
- **Effort de nettoyage** : nécessite une passe de validation manuelle ou semi-manuelle pour les missions dont le nom s'étend sur plusieurs lignes ou les fusions de cellules.
- **Non générique** : ne fonctionnera pas tel quel sur un PLF d'une autre année sans adaptation.
