#!/usr/bin/env python3
"""Synchronise les données et sources locales servies avec le dashboard.

Ne télécharge aucune source et n'invente aucun chiffre. Les deux PDF locaux,
non versionnés, doivent être fournis pour reconstruire une publication.
"""
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'sqlrooms-dashboard/public'


def main():
    for name in ('l17b3210_projet-loi.pdf', 'plfss_2027_texte.pdf'):
        if not (ROOT / name).is_file():
            raise SystemExit(f'Source locale manquante : {ROOT / name}')
    subprocess.run([sys.executable, str(ROOT / 'extract_budget.py')], cwd=ROOT, check=True)
    (PUBLIC / 'data').mkdir(parents=True, exist_ok=True)
    (PUBLIC / 'sources').mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / 'data/staging/fact_credits.csv', PUBLIC / 'data/fact_credits.csv')
    for name in ('dim_contexte.csv', 'fact_mesures_plfss.csv'):
        shutil.copy2(ROOT / 'sources' / name, ROOT / 'data/staging' / name)
        shutil.copy2(ROOT / 'sources' / name, PUBLIC / 'data' / name)
    for name in ('l17b3210_projet-loi.pdf', 'plfss_2027_texte.pdf'):
        shutil.copy2(ROOT / name, PUBLIC / 'sources' / name)


if __name__ == '__main__':
    main()
