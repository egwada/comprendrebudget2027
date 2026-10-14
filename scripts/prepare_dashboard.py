#!/usr/bin/env python3
"""Prépare les données et les sources locales servies avec le dashboard.

L’extraction des crédits utilise le PDF PLF versionné. Les liens PLF et PLFSS
pointent vers leurs publications officielles ; seuls les fichiers nécessaires
au dashboard sont copiés dans le dossier public.
"""
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'sqlrooms-dashboard/public'


def main():
    plf_pdf = ROOT / 'l17b3210_projet-loi.pdf'
    if not plf_pdf.is_file():
        raise SystemExit(f'Source locale manquante : {plf_pdf}')
    for name in (
        'fact_solde_apu.csv', 'fact_solde_budget_general_etat.csv', 'fact_interets_apu.csv',
        'fact_encours_dette_apu.csv', 'fact_financement_dette_etat.csv',
        'neb-2024-gestion-dette-tresorerie-etat.pdf',
    ):
        if not (ROOT / 'sources' / name).is_file():
            raise SystemExit(f'Source financière manquante : {ROOT / "sources" / name}')
    subprocess.run([sys.executable, str(ROOT / 'extract_budget.py')], cwd=ROOT, check=True)
    (PUBLIC / 'data').mkdir(parents=True, exist_ok=True)
    (PUBLIC / 'sources').mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / 'data/staging/fact_credits.csv', PUBLIC / 'data/fact_credits.csv')
    for name in (
        'dim_contexte.csv', 'fact_mesures_plfss.csv',
        'fact_solde_apu.csv', 'fact_solde_budget_general_etat.csv', 'fact_interets_apu.csv',
        'fact_encours_dette_apu.csv', 'fact_financement_dette_etat.csv',
    ):
        shutil.copy2(ROOT / 'sources' / name, ROOT / 'data/staging' / name)
        shutil.copy2(ROOT / 'sources' / name, PUBLIC / 'data' / name)
    # Remove copies from older builds: PLF/PLFSS citations now target their official publishers.
    for name in ('l17b3210_projet-loi.pdf', 'plfss_2027_texte.pdf'):
        (PUBLIC / 'sources' / name).unlink(missing_ok=True)
    shutil.copy2(
        ROOT / 'sources/neb-2024-gestion-dette-tresorerie-etat.pdf',
        PUBLIC / 'sources/neb-2024-gestion-dette-tresorerie-etat.pdf',
    )


if __name__ == '__main__':
    main()
