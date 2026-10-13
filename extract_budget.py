"""
Extraction des crédits par mission et programme depuis le PDF du PLF 2027.
Utilise les positions des mots (x, y) pour détecter les colonnes de montants.
Produit des fichiers CSV et Parquet dans data/raw/ et data/staging/.
"""

import re
import csv
import sys
from pathlib import Path
from collections import defaultdict

import pdfplumber

try:
    import pyarrow as pa
    import pyarrow.parquet as pq
    HAS_PYARROW = True
except ImportError:
    HAS_PYARROW = False

PDF_PATH = Path("l17b3210_projet-loi.pdf")
OUT_DIR = Path("data")
RAW_DIR = OUT_DIR / "raw"
STAGING_DIR = OUT_DIR / "staging"


def clean_amount(tokens: list[str]) -> int | None:
    """Convertit une liste de tokens ['122', '563', '852'] en entier."""
    if not tokens:
        return None
    s = "".join(tokens)
    if not s.isdigit():
        return None
    try:
        return int(s)
    except ValueError:
        return None


def cluster_positions(positions: list[float], threshold: float = 20.0) -> list[float]:
    """Regroupe des positions x en clusters par proximité. Retourne le centre de chaque cluster."""
    if not positions:
        return []
    sorted_pos = sorted(positions)
    clusters = []
    current = [sorted_pos[0]]
    for pos in sorted_pos[1:]:
        if pos - current[-1] <= threshold:
            current.append(pos)
        else:
            clusters.append(sum(current) / len(current))
            current = [pos]
    clusters.append(sum(current) / len(current))
    return clusters


def is_header_line(words: list[dict]) -> bool:
    """Détermine si une ligne est un en-tête de tableau (pas de données)."""
    text = " ".join(w["text"] for w in words).lower()
    header_keywords = [
        "mission / programme",
        "autorisations d'engagement",
        "crédits de paiement",
        "lfi 2026",
        "plf 2027",
        "d'engagement",
        "de paiement",
        "(en euros)",
        "tableau de comparaison",
        "hors fonds de concours",
        "des crédits proposés",
        "à ceux votés pour",
        "par titre, mission et programme",
        "du budget général",
    ]
    return any(kw in text for kw in header_keywords)


def is_non_data_line(text: str) -> bool:
    """Vrai si la ligne est un sous-titre, section, ou texte explicatif (pas un nom de mission/programme)."""
    text = text.strip()
    non_data_prefixes = [
        "Tableaux",
        "1.", "2.", "3.", "4.", "5.", "6.", "7.",
        "Tableau",
        "hors fonds de concours",
        "des crédits proposés",
        "à ceux votés pour",
        "(en euros)",
        "Projet de loi de finances",
    ]
    return any(text.startswith(p) for p in non_data_prefixes) or text in ["(en euros)", " générales"]


def is_grouping_line(text: str) -> bool:
    """Vrai si la ligne est un titre de groupe sans montants."""
    text = text.strip()
    grouping = [
        "Missions",
        "Missions ministérielles",
        "Missions constituées de dotations",
        "Missions interministérielles",
    ]
    return text in grouping or text.startswith("Missions ")


def is_page_number_or_footer(text: str, page_num: int) -> bool:
    """Vrai si la ligne ressemble à un numéro de page isolé ou un footer."""
    text = text.strip()
    # Just a number matching the page number
    if text == str(page_num):
        return True
    # Number followed by "Projet de loi de finances" or similar
    if re.match(rf"^{page_num}\s+Projet", text):
        return True
    return False


def extract_budget_pages(pdf) -> list[dict]:
    """Extrait les lignes budgétaires de toutes les pages du PDF."""
    all_rows: list[dict] = []
    current_titre = "Récapitulatif général"

    for page_num, page in enumerate(pdf.pages, start=1):
        text = page.extract_text() or ""
        # Filtrer : pages avec le marqueur "Mission / Programme" ET "LFI 2026"
        if "Mission / Programme" not in text:
            continue
        if "LFI 2026" not in text and "PLF 2027" not in text:
            continue
        if "(en euros)" not in text:
            continue

        words = page.extract_words()

        # Regrouper les mots par ligne (approximation via y-position)
        lines: dict[float, list[dict]] = defaultdict(list)
        for w in words:
            y_key = round(float(w["top"]), 0)
            lines[y_key].append(w)

        sorted_y = sorted(lines.keys())

        # Extraire toutes les positions x des mots purement numériques
        numeric_x_positions: list[float] = []
        for y in sorted_y:
            for w in lines[y]:
                if w["text"].strip().replace(" ", "").isdigit():
                    numeric_x_positions.append(float(w["x0"]))

        if len(numeric_x_positions) < 10:
            continue

        col_centers = cluster_positions(numeric_x_positions, threshold=25.0)

        col_counts = defaultdict(int)
        for y in sorted_y:
            for w in lines[y]:
                if w["text"].strip().replace(" ", "").isdigit():
                    x = float(w["x0"])
                    best_col = min(col_centers, key=lambda c: abs(c - x))
                    if abs(best_col - x) <= 40:
                        col_counts[best_col] += 1

        sorted_cols = sorted(col_counts.keys())
        rightmost_cols = sorted(sorted_cols, key=lambda c: col_counts[c], reverse=True)[:4]
        rightmost_cols.sort()

        if len(rightmost_cols) < 4:
            print(f"  Page {page_num}: only {len(rightmost_cols)} amount columns found, skipping")
            continue

        print(f"  Page {page_num}: columns at x={[round(c,1) for c in rightmost_cols]}")

        current_mission: str | None = None
        pending_continuation: str | None = None

        for y in sorted_y:
            line_words = sorted(lines[y], key=lambda w: float(w["x0"]))
            line_text = " ".join(w["text"] for w in line_words).strip()

            # Ignorer les lignes d'en-tête de tableau
            if is_header_line(line_words):
                continue

            # Ignorer les numéros de page / footer
            if is_page_number_or_footer(line_text, page_num):
                continue

            # Détection de titre de section
            if line_text.startswith("Titre ") and any(k in line_text for k in [
                "Dotations", "Dépenses", "Charges", "Investissement",
                "Intervention", "opérations financières"
            ]):
                current_titre = line_text
                current_mission = None
                pending_continuation = None
                continue
            elif line_text.startswith("Titre "):
                m = re.match(r"^(Titre\s+\d+[.].*)$", line_text)
                if m:
                    current_titre = line_text
                    current_mission = None
                    pending_continuation = None
                    continue

            # Ignorer les lignes de groupement sans montants
            if is_grouping_line(line_text):
                current_mission = None
                pending_continuation = None
                continue

            # Ignorer les lignes de texte non-données
            if is_non_data_line(line_text):
                pending_continuation = None
                continue

            # Séparer les mots numériques des mots de texte
            name_words = []
            col_values: dict[int, list[str]] = defaultdict(list)

            for w in line_words:
                txt = w["text"].strip()
                x = float(w["x0"])

                if txt.isdigit():
                    best_idx = min(range(len(rightmost_cols)), key=lambda i: abs(rightmost_cols[i] - x))
                    if abs(rightmost_cols[best_idx] - x) <= 40:
                        col_values[best_idx].append(txt)
                    else:
                        name_words.append(txt)
                else:
                    name_words.append(txt)

            # Si aucune valeur numérique, c'est une ligne de texte (continuation potentielle)
            if not col_values:
                name = " ".join(name_words).strip()
                name = re.sub(r"\s*\((nouveau|ancien)\)\s*$", "", name)
                if name and len(name) > 2:
                    if pending_continuation:
                        pending_continuation += " " + name
                    else:
                        pending_continuation = name
                continue

            # Construire les 4 montants
            amounts: list[int | None] = [None, None, None, None]
            for col_idx in range(4):
                tokens = col_values.get(col_idx, [])
                if tokens:
                    amounts[col_idx] = clean_amount(tokens)

            # Construire le nom
            name = " ".join(name_words).strip()
            name = re.sub(r"\s*\((nouveau|ancien)\)\s*$", "", name)

            # Appliquer la continuation en attente
            if pending_continuation:
                name = pending_continuation + " " + name
                pending_continuation = None

            if not name:
                continue

            # Déterminer mission vs programme
            is_mission = False
            if current_mission is None:
                is_mission = True
            elif name == current_mission:
                is_mission = True

            if is_mission:
                current_mission = name
                programme_name = "(total mission)"
            else:
                programme_name = name

            row = {
                "titre": current_titre,
                "mission": current_mission,
                "programme": programme_name,
                "ae_lfi_2026": amounts[0],
                "ae_plf_2027": amounts[1],
                "cp_lfi_2026": amounts[2],
                "cp_plf_2027": amounts[3],
                "source_page": page_num,
            }
            all_rows.append(row)

    return all_rows


def extract_all() -> list[dict]:
    print(f"Opening {PDF_PATH} ...")
    with pdfplumber.open(PDF_PATH) as pdf:
        print(f"Total pages: {len(pdf.pages)}")
        rows = extract_budget_pages(pdf)
    print(f"\nTotal rows extracted: {len(rows)}")
    return rows


def save_csv(rows: list[dict], path: Path) -> None:
    if not rows:
        return
    keys = list(rows[0].keys())
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        writer.writerows(rows)
    print(f"CSV saved: {path}")


def save_parquet(rows: list[dict], path: Path) -> None:
    if not HAS_PYARROW or not rows:
        return
    import pandas as pd
    df = pd.DataFrame(rows)
    df.to_parquet(path, index=False)
    print(f"Parquet saved: {path}")


def build_staging(rows: list[dict]) -> tuple[list[dict], list[dict]]:
    """
    Transforme les lignes brutes en tables de staging normalisées :
    - dim_mission
    - fact_credits (format long : une ligne par type_credit x annee)
    """
    missions: dict[str, dict] = {}
    facts: list[dict] = []

    for r in rows:
        mission = r.get("mission") or "INCONNU"
        titre = r.get("titre") or "Sans titre"
        programme = r.get("programme") or "(total mission)"

        if mission not in missions:
            missions[mission] = {"mission": mission, "titre": titre}

        for col, type_credit, annee in [
            ("ae_lfi_2026", "AE", 2026),
            ("ae_plf_2027", "AE", 2027),
            ("cp_lfi_2026", "CP", 2026),
            ("cp_plf_2027", "CP", 2027),
        ]:
            val = r.get(col)
            if val is not None:
                facts.append({
                    "titre": titre,
                    "mission": mission,
                    "programme": programme,
                    "type_credit": type_credit,
                    "annee": annee,
                    "montant": val,
                    "source_page": r.get("source_page"),
                })

    dim_mission = list(missions.values())
    return dim_mission, facts


def main():
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    STAGING_DIR.mkdir(parents=True, exist_ok=True)

    rows = extract_all()

    if not rows:
        print("No rows extracted. Aborting.")
        sys.exit(1)

    # Sauvegarder données brutes
    save_csv(rows, RAW_DIR / "raw_credits.csv")
    save_parquet(rows, RAW_DIR / "raw_credits.parquet")

    # Staging
    dim_mission, fact_credits = build_staging(rows)
    save_csv(dim_mission, STAGING_DIR / "dim_mission.csv")
    save_parquet(dim_mission, STAGING_DIR / "dim_mission.parquet")
    save_csv(fact_credits, STAGING_DIR / "fact_credits.csv")
    save_parquet(fact_credits, STAGING_DIR / "fact_credits.parquet")

    print("\nDone.")


if __name__ == "__main__":
    main()
