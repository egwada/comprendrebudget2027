"""Extraction déterministe du récapitulatif du PDF officiel du PLF 2027.

Les colonnes sont localisées par leurs en-têtes, pas par le nombre de montants.
Une cellule vide vaut zéro dans ce tableau (programme nouveau, ancien ou sans
crédits). Les libellés sont assemblés avant la construction des faits.
"""
import csv
import re
from collections import defaultdict
from pathlib import Path

import pdfplumber

PDF_PATH = Path('l17b3210_projet-loi.pdf')
RAW_DIR = Path('data/raw')
STAGING_DIR = Path('data/staging')
AMOUNT_COLUMNS = ('ae_lfi_2026', 'ae_plf_2027', 'cp_lfi_2026', 'cp_plf_2027')


def extract_budget_pages(pdf) -> list[dict]:
    rows = []
    current_mission = None
    active = False
    for page_num, page in enumerate(pdf.pages, 1):
        text = page.extract_text() or ''
        if '1. Tableau de comparaison, par mission et programme du budget général' in text:
            active = True
        elif active and '2. Tableau' in text:
            break
        if not active or 'Mission / Programme' not in text or 'LFI 2026' not in text:
            continue
        lines = defaultdict(list)
        for word in page.extract_words(extra_attrs=['fontname']):
            lines[round(word['top'])].append(word)
        header_y = next(y for y, words in lines.items()
                        if sum(w['text'] == 'LFI' for w in words) == 2)
        headers = sorted((w for w in lines[header_y] if w['text'] in ('LFI', 'PLF')),
                         key=lambda w: w['x0'])
        centers = [w['x0'] + 18 for w in headers]
        boundaries = [(a + b) / 2 for a, b in zip(centers, centers[1:])]
        numeric_left = headers[0]['x0'] - 25
        last_y = None
        for y in sorted(lines):
            if y <= header_y or y > page.height - 30:
                continue
            words = sorted(lines[y], key=lambda w: w['x0'])
            line = ' '.join(w['text'] for w in words)
            if line.startswith('Missions '):
                last_y = None
                continue
            numbers = [w for w in words if w['text'].isdigit() and w['x0'] >= numeric_left]
            labels = [w for w in words if w not in numbers]
            name = ' '.join(w['text'] for w in labels).strip()
            if not name:
                continue
            # 9,7 pt entre lignes d'un libellé, >=16 pt entre entrées.
            if not numbers and last_y is not None and y - last_y <= 12:
                last = rows[-1]
                if last['programme'] == '(total mission)':
                    last['mission'] += ' ' + name
                    current_mission = last['mission']
                else:
                    last['programme'] += ' ' + name
                last_y = y
                continue
            cells = [[] for _ in range(4)]
            for word in numbers:
                center = (word['x0'] + word['x1']) / 2
                column = sum(center > boundary for boundary in boundaries)
                cells[column].append(word['text'])
            bold = any('Bold' in w.get('fontname', '') for w in labels)
            if bold:
                current_mission = name
            if current_mission is None:
                raise ValueError(f'Programme sans mission p. {page_num}: {name}')
            rows.append({
                'titre': 'Récapitulatif général',
                'mission': current_mission,
                'programme': '(total mission)' if bold else name,
                **{col: int(''.join(cell)) if cell else 0
                   for col, cell in zip(AMOUNT_COLUMNS, cells)},
                'source_page': page_num,
                'qualite_extraction': 'cellules_vides_zero' if any(not cell for cell in cells)
                                      else 'extrait_pdf',
            })
            last_y = y
    for row in rows:
        row['programme'] = re.sub(r'\s*\((nouveau|ancien)\)\s*$', '', row['programme'])
    return rows


def save_csv(rows: list[dict], path: Path) -> None:
    if not rows:
        raise ValueError(f'Aucune donnée pour {path}')
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    print(f'CSV saved: {path} ({len(rows)} lignes)')


def build_staging(rows: list[dict]) -> tuple[list[dict], list[dict]]:
    missions = {}
    facts = []
    for row in rows:
        mission = row['mission']
        missions.setdefault(mission, {'mission': mission, 'titre': row['titre']})
        for col, ct, year in zip(AMOUNT_COLUMNS, ('AE', 'AE', 'CP', 'CP'), (2026, 2027, 2026, 2027)):
            facts.append({
                'titre': row['titre'], 'scope': 'budget_general', 'nature': 'credits_prevus',
                'mission': mission, 'programme': row['programme'],
                'type_credit': ct, 'annee': year, 'montant': row[col], 'unite': 'EUR',
                'source_document': PDF_PATH.name, 'source_page': row['source_page'],
                'qualite_extraction': row['qualite_extraction'],
            })
    return list(missions.values()), facts


def main():
    with pdfplumber.open(PDF_PATH) as pdf:
        rows = extract_budget_pages(pdf)
    save_csv(rows, RAW_DIR / 'raw_credits.csv')
    missions, facts = build_staging(rows)
    save_csv(missions, STAGING_DIR / 'dim_mission.csv')
    save_csv(facts, STAGING_DIR / 'fact_credits.csv')


if __name__ == '__main__':
    main()
