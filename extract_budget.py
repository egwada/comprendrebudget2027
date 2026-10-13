"""
Extraction robuste des crédits par mission et programme depuis le PDF du PLF 2027.
Utilise les positions (x, y) et la fonte (gras = mission, normal = programme) pour
identifier la hiérarchie.

Produit des fichiers CSV dans data/raw/ et data/staging/.
"""

import re
import csv
import sys
from pathlib import Path
from collections import defaultdict

import pdfplumber

PDF_PATH = Path("l17b3210_projet-loi.pdf")
OUT_DIR = Path("data")
RAW_DIR = OUT_DIR / "raw"
STAGING_DIR = OUT_DIR / "staging"

CONTINUATION_ENDINGS = {
    "au", "aux", "de", "des", "du", "d'", "et", "ou", "à", "en",
    "par", "pour", "sur", "sous", "vers", "avec", "sans", "dans",
    "l'", "la", "le", "les",
}

SKIP_KEYWORDS = {
    "projet de loi de finances",
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
}

GROUPING_KEYWORDS = {
    "missions",
    "missions ministérielles",
    "missions constituées de dotations",
    "missions interministérielles",
}


def is_header_line(line_text: str) -> bool:
    return any(kw in line_text.lower().strip() for kw in SKIP_KEYWORDS)


def is_grouping_line(line_text: str) -> bool:
    return line_text.strip().lower() in GROUPING_KEYWORDS


def is_page_number_line(line_text: str, page_num: int) -> bool:
    text = line_text.strip()
    return text == str(page_num) or re.match(rf"^{page_num}\s+Projet", text) is not None


def is_titre_line(line_text: str) -> str | None:
    text = line_text.strip()
    if text.startswith("Titre "):
        if any(k in text for k in [
            "Dotations", "Dépenses", "Charges", "Investissement",
            "Intervention", "opérations financières"
        ]):
            return text
        if re.match(r"^Titre\s+\d+[.].*$", text):
            return text
    return None


def clean_amount(tokens: list[dict]) -> int | None:
    s = "".join(t["text"].strip() for t in tokens)
    if not s.isdigit():
        return None
    try:
        return int(s)
    except ValueError:
        return None


def find_numeric_blocks(words: list[dict], gap_threshold: float = 30.0) -> list[list[dict]]:
    numeric = [w for w in words if w["text"].strip().isdigit()]
    if not numeric:
        return []
    numeric.sort(key=lambda w: float(w["x0"]))
    blocks = []
    current = [numeric[0]]
    for w in numeric[1:]:
        if float(w["x0"]) - float(current[-1]["x0"]) <= gap_threshold:
            current.append(w)
        else:
            blocks.append(current)
            current = [w]
    blocks.append(current)
    return blocks


def is_continuation(line_text: str, prev_data_ending: str) -> bool:
    text = line_text.strip()
    if not text:
        return False
    last_word = prev_data_ending.strip().lower().rstrip(".,;")
    if last_word in CONTINUATION_ENDINGS:
        return True
    if text[0].islower():
        return True
    return False


def is_bold_line(words: list[dict]) -> bool:
    """Vrai si au moins un mot non-numérique de la ligne est en gras."""
    for w in words:
        if not w["text"].strip().isdigit():
            fontname = w.get("fontname", "")
            if "Bold" in fontname:
                return True
    return False


def extract_budget_pages(pdf) -> list[dict]:
    all_data_lines: list[dict] = []
    current_titre = "Récapitulatif général"
    current_mission: str | None = None

    for page_num, page in enumerate(pdf.pages, start=1):
        text = page.extract_text() or ""
        if "Mission / Programme" not in text:
            continue
        if "LFI 2026" not in text and "PLF 2027" not in text:
            continue
        if "(en euros)" not in text:
            continue

        words = page.extract_words(extra_attrs=["fontname"])
        lines_by_y: dict[int, list[dict]] = defaultdict(list)
        for w in words:
            lines_by_y[round(float(w["top"]))].append(w)

        sorted_y = sorted(lines_by_y.keys())
        pending_name: str = ""
        last_data_name: str = ""

        for y in sorted_y:
            line_words = sorted(lines_by_y[y], key=lambda w: float(w["x0"]))
            line_text = " ".join(w["text"] for w in line_words).strip()
            if not line_text:
                continue
            if is_page_number_line(line_text, page_num):
                continue

            titre = is_titre_line(line_text)
            if titre:
                current_titre = titre
                current_mission = None
                pending_name = ""
                continue

            if is_header_line(line_text):
                pending_name = ""
                continue
            if is_grouping_line(line_text):
                current_mission = None
                pending_name = ""
                continue
            if any(line_text.startswith(p) for p in [
                "Tableaux", "1.", "2.", "3.", "4.", "5.", "6.", "7.",
                "Tableau", "(en euros)", " générales", "hors fonds de concours",
                "des crédits proposés", "à ceux votés pour",
            ]):
                pending_name = ""
                continue

            clean_text = re.sub(r"\s*\((nouveau|ancien)\)\s*$", "", line_text)
            numeric_blocks = find_numeric_blocks(line_words)

            if len(numeric_blocks) >= 4:
                amounts = [clean_amount(block) for block in numeric_blocks[-4:]]
                name_words = []
                for w in line_words:
                    if not w["text"].strip().isdigit():
                        name_words.append(w["text"])
                for block in numeric_blocks[:-4]:
                    for w in block:
                        name_words.append(w["text"])
                name = " ".join(name_words).strip()

                # Appliquer la continuation en attente à la DERNIERE ligne de données
                if pending_name and all_data_lines:
                    last = all_data_lines[-1]
                    if last["programme"] == "(total mission)":
                        last["mission"] += " " + pending_name
                    else:
                        last["programme"] += " " + pending_name
                    pending_name = ""

                bold = is_bold_line(line_words)
                if bold:
                    current_mission = name
                    programme = "(total mission)"
                else:
                    programme = name

                row = {
                    "titre": current_titre,
                    "mission": current_mission or name,
                    "programme": programme,
                    "ae_lfi_2026": amounts[0],
                    "ae_plf_2027": amounts[1],
                    "cp_lfi_2026": amounts[2],
                    "cp_plf_2027": amounts[3],
                    "source_page": page_num,
                }
                all_data_lines.append(row)
                last_data_name = name if not bold else current_mission
            else:
                if all_data_lines and is_continuation(clean_text, last_data_name):
                    pending_name += (" " if pending_name else "") + clean_text
                else:
                    pending_name = ""

    return all_data_lines


def save_csv(rows: list[dict], path: Path) -> None:
    if not rows:
        return
    keys = list(rows[0].keys())
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        writer.writerows(rows)
    print(f"CSV saved: {path}")


def build_staging(rows: list[dict]) -> tuple[list[dict], list[dict]]:
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

    print(f"Opening {PDF_PATH} ...")
    with pdfplumber.open(PDF_PATH) as pdf:
        print(f"Total pages: {len(pdf.pages)}")
        rows = extract_budget_pages(pdf)
    print(f"Total rows extracted: {len(rows)}")

    if not rows:
        print("No rows extracted. Aborting.")
        sys.exit(1)

    # Ne garder que le récapitulatif général pour éviter les doublons
    # (les pages 314+ contiennent les mêmes missions/programmes répartis par titre)
    recap_rows = [r for r in rows if r.get("titre") == "Récapitulatif général"]
    print(f"Rows in récapitulatif général: {len(recap_rows)}")
    if not recap_rows:
        print("Warning: no récapitulatif général found, using all rows.")
        recap_rows = rows

    save_csv(recap_rows, RAW_DIR / "raw_credits.csv")
    dim_mission, fact_credits = build_staging(recap_rows)
    save_csv(dim_mission, STAGING_DIR / "dim_mission.csv")
    save_csv(fact_credits, STAGING_DIR / "fact_credits.csv")
    print("\nDone.")


if __name__ == "__main__":
    main()
