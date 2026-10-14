#!/usr/bin/env python3
"""Récupère et curatise des données publiques sur solde et dette.

Sources officielles : base AMECO de la Commission européenne et rapport 2024
sur la dette et la trésorerie de l'État de la Cour des comptes (données AFT).
Les fichiers produits sont des instantanés sourcés, pas des prévisions du PLF local.
"""
import csv
import io
import sys
import urllib.request
import zipfile
import xml.etree.ElementTree as ET
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / 'sources'
AMECO_URL = 'https://ec.europa.eu/economy_finance/db_indicators/ameco/documents/ameco0_csv.zip'
COUR_URL = 'https://www.ccomptes.fr/sites/default/files/2025-05/NEB-2024-Gestion-dette-et-tresorerie-Etat.pdf'
INSEE_URL = 'https://api.insee.fr/series/BDM/V1/data/SERIES_BDM/001717255'
INSEE_PAGE = 'https://www.insee.fr/fr/statistiques/serie/001717255'

# Tableau 1 du rapport Cour des comptes 2024, pp. imprimées 14–15, source des
# observations : AFT. Les montants sont en Md€ et concernent l'exécution.
FINANCEMENT_ETAT_2019_2024 = [
    (2019, '130.2', '128.9', '1.3', '0', '0', '92.7', '200.0', '', ''),
    (2020, '136.1', '130.5', '5.6', '1.7', '0.5', '178.1', '260.0', '', ''),
    (2021, '118.3', '117.5', '0.8', '1.3', '0', '170.7', '260.0', '', ''),
    (2022, '145.7', '140.8', '5.0', '3.0', '0', '151.5', '260.0', '', ''),
    (2023, '149.6', '144.5', '5.1', '2.1', '0.9', '173.3', '270.0', '53.9', '41.5'),
    (2024, '155.1', '151.1', '4.0', '2.7', '0', '155.9', '285.0', '49.3', '46.5'),
]


def download(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'data-syn-mgnt/1.0'})
    with urllib.request.urlopen(request, timeout=90) as response:
        return response.read()


def ameco_rows(archive_bytes, filename):
    with zipfile.ZipFile(io.BytesIO(archive_bytes)) as archive:
        info = archive.getinfo(filename)
        version = date(*info.date_time[:3]).isoformat()
        raw = archive.read(filename).decode('latin-1')
    rows = {}
    for row in csv.DictReader(io.StringIO(raw)):
        rows[row['CODE']] = row
    return rows, version


def get_value(rows, code, year):
    row = rows.get(code)
    if row is None:
        raise ValueError(f'Code AMECO absent : {code}')
    value = row.get(str(year), 'NA').strip()
    if value in ('', 'NA'):
        return None
    return value


def write_csv(name, headers, rows):
    path = SOURCES / name
    with path.open('w', newline='', encoding='utf-8') as stream:
        writer = csv.DictWriter(stream, fieldnames=headers, lineterminator='\n')
        writer.writeheader()
        writer.writerows(rows)


def build_ameco(archive_bytes):
    ameco16, version16 = ameco_rows(archive_bytes, 'AMECO16.CSV')
    ameco18, version18 = ameco_rows(archive_bytes, 'AMECO18.CSV')
    if version16 != version18:
        raise ValueError('Versions AMECO16/AMECO18 différentes')
    version = version16
    url = 'https://economy-finance.ec.europa.eu/economic-research-and-databases/economic-databases/ameco-database/download-annual-data-set-macro-economic-database-ameco_en'

    balance_rows = []
    for year in range(1974, 2025):
        amount = get_value(ameco16, 'FRA.1.0.99.0.UBLGE', year)
        percent = get_value(ameco16, 'FRA.1.0.319.0.UBLGE', year)
        if amount is None or percent is None:
            raise ValueError(f'Solde APU manquant pour {year}')
        balance_rows.append({
            'annee': year,
            'solde_md_eur': amount,
            'solde_pct_pib': percent,
            'unite_montant': 'Md ECU/EUR (AMECO)',
            'perimetre': 'Administrations publiques',
            'nature': 'solde_net_financement_EDP',
            'statut': 'exécution (série révisable)',
            'source_dataset': 'AMECO16',
            'source_code': 'FRA.1.0.319.0.UBLGE',
            'source_url': url,
            'version_source': version,
        })

    interest_rows = []
    for year in range(1974, 2025):
        amount = get_value(ameco16, 'FRA.1.0.99.0.UYIGE', year)
        percent = get_value(ameco16, 'FRA.1.0.319.0.UYIGE', year)
        # La source ne publie pas de valeur avant 1980 : conserver l'absence,
        # ne jamais fabriquer des zéros pour ces années.
        if amount is None and percent is None:
            continue
        if amount is None or percent is None:
            raise ValueError(f'Intérêts APU incomplets pour {year}')
        interest_rows.append({
            'annee': year,
            'interets_md_eur': amount,
            'interets_pct_pib': percent,
            'unite_montant': 'Md ECU/EUR (AMECO)',
            'perimetre': 'Administrations publiques',
            'nature': 'intérêts, procédure de déficit excessif',
            'statut': 'exécution (série révisable)',
            'source_dataset': 'AMECO16',
            'source_code': 'FRA.1.0.319.0.UYIGE',
            'source_url': url,
            'version_source': version,
        })

    debt_rows = []
    for year in range(1974, 2025):
        amount = get_value(ameco18, 'FRA.1.0.99.0.UDGGL', year)
        percent = get_value(ameco18, 'FRA.1.0.319.0.UDGGL', year)
        if amount is None and percent is None:
            continue
        if amount is None or percent is None:
            raise ValueError(f'Encours de dette APU incomplet pour {year}')
        debt_rows.append({
            'annee': year,
            'encours_md_eur': amount,
            'encours_pct_pib': percent,
            'unite_montant': 'Md ECU/EUR (AMECO)',
            'perimetre': 'Administrations publiques',
            'nature': 'dette brute consolidée, série historique liée',
            'statut': 'exécution (série révisable)',
            'source_dataset': 'AMECO18',
            'source_code': 'FRA.1.0.319.0.UDGGL',
            'source_url': url,
            'version_source': version,
        })

    write_csv('fact_solde_apu.csv', list(balance_rows[0]), balance_rows)
    write_csv('fact_interets_apu.csv', list(interest_rows[0]), interest_rows)
    write_csv('fact_encours_dette_apu.csv', list(debt_rows[0]), debt_rows)


def build_solde_budget_general_etat(raw_xml):
    root = ET.fromstring(raw_xml)
    series = root.find('.//Series')
    if series is None or series.get('IDBANK') != '001717255':
        raise ValueError('La réponse INSEE ne contient pas la série 001717255 attendue')
    if series.get('UNIT_MEASURE') != 'EUROS' or series.get('UNIT_MULT') != '6':
        raise ValueError('Unité INSEE inattendue pour la série de solde budgétaire')

    observations = {}
    for observation in root.findall('.//Obs'):
        period = observation.get('TIME_PERIOD', '')
        year, separator, month = period.partition('-')
        if separator and month == '12' and 2009 <= int(year) <= 2025:
            # L'INSEE fournit un cumul en millions d'euros (EUROS × 10^6).
            observations[int(year)] = float(observation.get('OBS_VALUE', 'nan')) / 1000

    expected_years = list(range(2009, 2026))
    if sorted(observations) != expected_years:
        raise ValueError(f'Années INSEE absentes : attendu {expected_years}, reçu {sorted(observations)}')
    version = series.get('LAST_UPDATE', '')
    url = INSEE_PAGE
    rows = []
    for year in expected_years:
        rows.append({
            'annee': year,
            'solde_md_eur': f"{observations[year]:.3f}",
            'unite': 'Md€',
            'perimetre': 'Budget général de l’État',
            'nature': 'solde général d’exécution, cumul annuel au mois de décembre',
            'statut': 'exécution',
            'observation': f'{year}-12',
            'source_dataset': 'Banque de données macro-économiques INSEE',
            'source_code': 'IDBANK:001717255',
            'source_url': url,
            'version_source': version,
            'note': 'Série mensuelle disponible depuis 2009 ; comptes spéciaux publiés dans une série distincte.',
        })
    write_csv('fact_solde_budget_general_etat.csv', list(rows[0]), rows)


def build_financement_etat():
    url = COUR_URL
    rows = []
    headers = [
        'annee', 'amortissement_mlt_md', 'remboursement_nominal_md',
        'remboursement_indexation_md', 'amortissement_dette_sncf_md',
        'amortissement_autres_dettes_md', 'deficit_budgetaire_md',
        'emissions_mlt_md', 'charge_dette_totale_md', 'interets_payes_md',
        'unite', 'perimetre', 'nature', 'statut',
        'source_document', 'source_pages', 'source_url', 'note',
    ]
    for year, amort, nominal, indexation, sncf, other, deficit, emissions, charge, interets in FINANCEMENT_ETAT_2019_2024:
        rows.append({
            'annee': year,
            'amortissement_mlt_md': amort,
            'remboursement_nominal_md': nominal,
            'remboursement_indexation_md': indexation,
            'amortissement_dette_sncf_md': sncf,
            'amortissement_autres_dettes_md': other,
            'deficit_budgetaire_md': deficit,
            'emissions_mlt_md': emissions,
            'charge_dette_totale_md': charge,
            'interets_payes_md': interets,
            'unite': 'Md€',
            'perimetre': 'État',
            'nature': 'tableau de financement ; amortissement est un flux de financement, pas une dépense à ajouter aux crédits ; émissions MLT nettes des rachats',
            'statut': 'exécution',
            'source_document': 'rapport_cour_des_comptes_dette_2024',
            'source_pages': (
                '6 (intérêts/charge 2023-2024) ; 14-15 (tableau 1 ; pagination imprimée), données AFT'
                if year >= 2023 else
                '14-15 (tableau 1, pagination imprimée), données AFT'
            ),
            'source_url': url,
            'note': 'Les montants sont arrondis au dixième de Md€ dans le rapport.',
        })
    write_csv('fact_financement_dette_etat.csv', headers, rows)


def main():
    SOURCES.mkdir(parents=True, exist_ok=True)
    ameco = download(AMECO_URL)
    if not ameco.startswith(b'PK'):
        raise ValueError('La réponse AMECO ne semble pas être une archive ZIP')
    (SOURCES / 'ameco0_csv.zip').write_bytes(ameco)
    build_ameco(ameco)

    insee = download(INSEE_URL)
    if b'<StructureSpecificData' not in insee and b'<message:StructureSpecificData' not in insee:
        raise ValueError('La réponse INSEE ne semble pas contenir le fichier de série attendu')
    (SOURCES / 'insee-solde-budget-general-etat.xml').write_bytes(insee)
    build_solde_budget_general_etat(insee)

    report = download(COUR_URL)
    if not report.startswith(b'%PDF'):
        raise ValueError('La réponse de la Cour des comptes ne semble pas être un PDF')
    (SOURCES / 'neb-2024-gestion-dette-tresorerie-etat.pdf').write_bytes(report)
    build_financement_etat()
    print('Sources actualisées : AMECO, série INSEE du budget général et tableau AFT/Cour des comptes 2019–2024.')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f'Échec de la récupération/curation : {exc}', file=sys.stderr)
        raise
