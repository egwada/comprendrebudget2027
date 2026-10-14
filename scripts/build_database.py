#!/usr/bin/env python3
"""Build a reusable DuckDB database and the web data dictionary."""
import json
import os
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'sqlrooms-dashboard/public'
DATABASE = PUBLIC / 'downloads/comprendrebudget2027.duckdb'
DICTIONARY = PUBLIC / 'data/data_dictionary.json'

TABLES = {
    'fact_credits': {
        'file': ROOT / 'data/staging/fact_credits.csv',
        'description': 'Crédits de paiement et autorisations d’engagement : totaux publiés par mission et détail des programmes.',
        'source': 'PLF 2027, Assemblée nationale, récapitulatif général.',
        'coverage': 'LFI 2026 et PLF 2027; budget général.',
        'fields': {
            'titre': 'Rubrique du document budgétaire.',
            'scope': 'Périmètre budgétaire; ici budget_general.',
            'nature': 'Nature des montants; ici credits_prevus.',
            'mission': 'Mission budgétaire, libellé repris du document.',
            'programme': 'Programme détaillé; (total mission) désigne le total imprimé.',
            'type_credit': 'CP (crédits de paiement) ou AE (autorisations d’engagement).',
            'annee': 'Année budgétaire : 2026 ou 2027.',
            'montant': 'Montant entier en euros.',
            'unite': 'Unité du montant; EUR.',
            'source_document': 'Nom du document source.',
            'source_page': 'Numéro de page source, base 1.',
            'qualite_extraction': 'Qualité de l’extraction; les cellules vides interprétées comme zéro sont marquées.',
        },
    },
    'dim_contexte': {
        'file': ROOT / 'sources/dim_contexte.csv',
        'description': 'Repères éditoriaux sur les finances publiques, dont les montants de 43 et 54 Md€.',
        'source': 'Rapport général du PLF 2027, pages 12–13.',
        'coverage': 'Repères portant sur 2027; le solde 54 − 43 est dérivé et signalé.',
        'fields': {
            'cle': 'Clé technique stable du repère.', 'libelle': 'Intitulé lisible du chiffre.',
            'valeur': 'Valeur numérique.', 'unite': 'Unité associée à la valeur.',
            'annee': 'Année de référence.', 'perimetre': 'Secteur institutionnel ou périmètre concerné.',
            'source_page': 'Page du document source, base 1.', 'note': 'Explication et réserves de périmètre ou de calcul.',
        },
    },
    'fact_mesures_plfss': {
        'file': ROOT / 'sources/fact_mesures_plfss.csv',
        'description': 'Mesures curatées du PLFSS; les lignes peuvent se recouper et ne doivent pas être additionnées.',
        'source': 'PLFSS_2027_web.pdf, publication officielle du ministère du Budget.',
        'coverage': '17 mesures, avec année et page source propres à chaque ligne.',
        'fields': {
            'branche': 'Branche de la Sécurité sociale concernée.', 'article': 'Article associé dans le texte.',
            'intitule': 'Intitulé de la mesure.', 'montant_md': 'Montant en milliards d’euros.',
            'effet': 'Nature de l’effet : économie, recette, dépense, transfert, objectif ou solde.',
            'annee': 'Année à laquelle la mesure se rapporte.', 'source_page': 'Page source, base 1.',
            'note': 'Précisions, limites ou réserves de non-additivité.',
        },
    },
    'fact_solde_apu': {
        'file': ROOT / 'sources/fact_solde_apu.csv',
        'description': 'Solde net de financement des administrations publiques selon la procédure de déficit excessif.',
        'source': 'AMECO, code FRA.1.0.319.0.UBLGE.', 'coverage': '1974–2024; série révisable.',
        'fields': {
            'annee': 'Année de référence.', 'solde_md_eur': 'Solde en milliards ECU/EUR selon l’année.',
            'solde_pct_pib': 'Solde rapporté au PIB, en pourcentage.', 'unite_montant': 'Unité monétaire de la série.',
            'perimetre': 'Secteurs institutionnels couverts; administrations publiques.',
            'nature': 'Définition statistique du solde.', 'statut': 'Statut de la valeur et réserve de révision.',
            'source_dataset': 'Nom de la base source.', 'source_code': 'Code de série dans la base.',
            'source_url': 'Adresse de la source officielle.', 'version_source': 'Date/version de l’archive source.',
        },
    },
    'fact_solde_budget_general_etat': {
        'file': ROOT / 'sources/fact_solde_budget_general_etat.csv',
        'description': 'Solde exécuté du budget général de l’État, observation de décembre pour chaque année complète.',
        'source': 'INSEE, série 001717255.', 'coverage': '2009–2025; les comptes spéciaux sont publiés séparément.',
        'fields': {
            'annee': 'Année complète.', 'solde_md_eur': 'Solde exécuté en milliards d’euros courants.',
            'unite': 'Unité monétaire.', 'perimetre': 'Périmètre couvert.',
            'nature': 'Définition de la série et du cumul annuel.', 'statut': 'Statut d’exécution.',
            'observation': 'Date de l’observation INSEE retenue.', 'source_dataset': 'Base source.',
            'source_code': 'Identifiant de série INSEE.', 'source_url': 'Adresse de la série officielle.',
            'version_source': 'Date de récupération/version.', 'note': 'Limites de périmètre et de couverture.',
        },
    },
    'fact_interets_apu': {
        'file': ROOT / 'sources/fact_interets_apu.csv',
        'description': 'Dépenses d’intérêts des administrations publiques selon les comptes nationaux.',
        'source': 'AMECO, code FRA.1.0.319.0.UYIGE.', 'coverage': '1978–2024; observations manquantes non assimilées à zéro.',
        'fields': {
            'annee': 'Année de référence.', 'interets_md_eur': 'Intérêts en milliards ECU/EUR selon l’année.',
            'interets_pct_pib': 'Intérêts rapportés au PIB, en pourcentage.', 'unite_montant': 'Unité monétaire de la série.',
            'perimetre': 'Secteurs institutionnels couverts.', 'nature': 'Définition comptable des intérêts.',
            'statut': 'Statut de la valeur et réserve de révision.', 'source_dataset': 'Nom de la base source.',
            'source_code': 'Code de série dans la base.', 'source_url': 'Adresse de la source officielle.',
            'version_source': 'Date/version de l’archive source.',
        },
    },
    'fact_encours_dette_apu': {
        'file': ROOT / 'sources/fact_encours_dette_apu.csv',
        'description': 'Encours de dette brute consolidée des administrations publiques en fin d’année.',
        'source': 'AMECO, code FRA.1.0.319.0.UDGGL.', 'coverage': '1977–2024; série historique liée et révisable.',
        'fields': {
            'annee': 'Année de référence.', 'encours_md_eur': 'Encours en milliards ECU/EUR selon l’année.',
            'encours_pct_pib': 'Encours rapporté au PIB, en pourcentage.', 'unite_montant': 'Unité monétaire de la série.',
            'perimetre': 'Secteurs institutionnels couverts.', 'nature': 'Dette brute consolidée en fin d’année.',
            'statut': 'Statut de la valeur et réserve de révision.', 'source_dataset': 'Nom de la base source.',
            'source_code': 'Code de série dans la base.', 'source_url': 'Adresse de la source officielle.',
            'version_source': 'Date/version de l’archive source.',
        },
    },
    'fact_financement_dette_etat': {
        'file': ROOT / 'sources/fact_financement_dette_etat.csv',
        'description': 'Tableau d’exécution du financement de la dette de l’État; principal, intérêts, charge et émissions restent séparés.',
        'source': 'Cour des comptes, rapport sur le budget de l’État en 2024, données AFT.',
        'coverage': '2019–2024; intérêts payés et charge totale publiés uniquement pour 2023–2024.',
        'fields': {
            'annee': 'Année d’exécution.', 'amortissement_mlt_md': 'Principal MLT amorti, en Md€.',
            'remboursement_nominal_md': 'Part nominale du principal remboursé, en Md€.',
            'remboursement_indexation_md': 'Part liée à l’indexation, en Md€.',
            'amortissement_dette_sncf_md': 'Amortissement de dette SNCF, en Md€.',
            'amortissement_autres_dettes_md': 'Amortissement d’autres dettes, en Md€.',
            'deficit_budgetaire_md': 'Déficit budgétaire financé, en Md€.',
            'emissions_mlt_md': 'Émissions à moyen/long terme nettes des rachats, en Md€.',
            'charge_dette_totale_md': 'Charge totale publiée de la dette, en Md€; NULL si non publiée.',
            'interets_payes_md': 'Intérêts payés publiés, en Md€; NULL si non publiés.',
            'unite': 'Unité des montants.', 'perimetre': 'Périmètre de la dette.',
            'nature': 'Définition des flux du tableau de financement.', 'statut': 'Statut d’exécution.',
            'source_document': 'Référence du rapport source.', 'source_pages': 'Pages imprimées utilisées.',
            'source_url': 'Adresse du rapport officiel.', 'note': 'Précisions d’arrondi et de disponibilité.',
        },
    },
}

VIEWS = {
    'v_missions_cp_2027': {
        'sql': """SELECT mission, SUM(montant) AS total FROM fact_credits
                 WHERE type_credit='CP' AND annee=2027 AND programme='(total mission)' AND scope='budget_general'
                 GROUP BY mission ORDER BY total DESC""",
        'description': 'Totaux CP publiés par mission pour le PLF 2027.',
        'source': 'Vue dérivée de fact_credits.', 'coverage': '2027, crédits de paiement.',
        'fields': {'mission': 'Mission budgétaire.', 'total': 'Total CP publié, en euros.'},
    },
    'v_missions_cp_2026': {
        'sql': """SELECT mission, SUM(montant) AS total FROM fact_credits
                 WHERE type_credit='CP' AND annee=2026 AND programme='(total mission)' AND scope='budget_general'
                 GROUP BY mission ORDER BY total DESC""",
        'description': 'Totaux CP votés par mission pour la LFI 2026.',
        'source': 'Vue dérivée de fact_credits.', 'coverage': '2026, crédits de paiement.',
        'fields': {'mission': 'Mission budgétaire.', 'total': 'Total CP publié, en euros.'},
    },
    'v_compare_missions': {
        'sql': """SELECT m2027.mission, m2026.total AS cp_2026, m2027.total AS cp_2027
                 FROM v_missions_cp_2027 m2027 LEFT JOIN v_missions_cp_2026 m2026 USING (mission)
                 ORDER BY m2027.total DESC""",
        'description': 'Comparaison des crédits de paiement 2026 et 2027 par mission.',
        'source': 'Vue dérivée des vues v_missions_cp_2026 et v_missions_cp_2027.',
        'coverage': 'LFI 2026 et PLF 2027.',
        'fields': {'mission': 'Mission budgétaire.', 'cp_2026': 'Total CP LFI 2026, en euros.', 'cp_2027': 'Total CP PLF 2027, en euros.'},
    },
    'v_programs': {
        'sql': """SELECT mission, programme,
                   SUM(CASE WHEN type_credit='CP' AND annee=2026 THEN montant ELSE 0 END) AS cp_2026,
                   SUM(CASE WHEN type_credit='CP' AND annee=2027 THEN montant ELSE 0 END) AS cp_2027,
                   SUM(CASE WHEN type_credit='AE' AND annee=2026 THEN montant ELSE 0 END) AS ae_2026,
                   SUM(CASE WHEN type_credit='AE' AND annee=2027 THEN montant ELSE 0 END) AS ae_2027
                 FROM fact_credits WHERE programme != '(total mission)' GROUP BY mission, programme""",
        'description': 'Crédits de programme agrégés en colonnes CP/AE et 2026/2027; les totaux mission sont exclus.',
        'source': 'Vue dérivée de fact_credits.', 'coverage': 'Programmes du budget général, LFI 2026 et PLF 2027.',
        'fields': {
            'mission': 'Mission budgétaire.', 'programme': 'Programme budgétaire.',
            'cp_2026': 'CP votés en 2026, euros.', 'cp_2027': 'CP prévus en 2027, euros.',
            'ae_2026': 'AE votées en 2026, euros.', 'ae_2027': 'AE prévues en 2027, euros.',
        },
    },
    'v_qualite': {
        'sql': """SELECT mission, type_credit, annee,
                   SUM(CASE WHEN programme='(total mission)' THEN montant ELSE 0 END)::DOUBLE AS total_mission,
                   SUM(CASE WHEN programme!='(total mission)' THEN montant ELSE 0 END)::DOUBLE AS total_programmes,
                   (total_mission-total_programmes)::DOUBLE AS ecart
                 FROM fact_credits WHERE scope='budget_general' GROUP BY mission,type_credit,annee""",
        'description': 'Réconciliation des totaux mission imprimés avec la somme des programmes; ecart = total publié − somme des programmes.',
        'source': 'Vue dérivée de fact_credits.', 'coverage': 'Chaque mission, CP/AE, années 2026/2027.',
        'fields': {
            'mission': 'Mission budgétaire.', 'type_credit': 'CP ou AE.', 'annee': 'Année budgétaire.',
            'total_mission': 'Total imprimé de la mission, euros.', 'total_programmes': 'Somme des lignes programmes, euros.',
            'ecart': 'Écart signé entre total mission et somme programmes, euros.',
        },
    },
}

CATALOG_TABLES = {
    'dataset_catalog': {
        'description': 'Catalogue des tables et vues du fichier DuckDB.',
        'source': 'Généré par scripts/build_database.py.',
        'coverage': 'Un enregistrement par objet documenté.',
        'fields': {
            'object_name': 'Nom SQL de la table ou vue.', 'object_type': 'TABLE ou VIEW.',
            'description': 'Rôle et contenu de l’objet.', 'source': 'Source documentaire ou table d’origine.',
            'coverage': 'Période et périmètre couverts.', 'row_count': 'Nombre de lignes au moment du build.',
        },
    },
    'column_catalog': {
        'description': 'Dictionnaire de données : colonnes, types DuckDB et signification des champs.',
        'source': 'Généré à partir des schémas effectifs du fichier DuckDB.',
        'coverage': 'Champs de chaque table et vue cataloguée.',
        'fields': {
            'object_name': 'Table ou vue contenant la colonne.', 'ordinal_position': 'Position dans le schéma.',
            'column_name': 'Nom SQL de la colonne.', 'data_type': 'Type DuckDB détecté au build.',
            'nullable': 'TRUE si la colonne accepte des valeurs NULL.', 'description': 'Signification du champ.',
        },
    },
}

SOURCE_FILES = [
    {
        'name': 'ameco0_csv.zip',
        'description': 'Archive des données annuelles AMECO utilisées pour préparer les séries de solde, intérêts et encours de dette des administrations publiques.',
        'coverage': 'Archive récupérée le 2 juin 2026; les codes et la version sont conservés dans les CSV curatés.',
        'database_objects': 'fact_solde_apu, fact_interets_apu, fact_encours_dette_apu',
    },
    {
        'name': 'dim_contexte.csv',
        'description': 'Six repères curatés sur les efforts annoncés, les dépenses, le déficit et la dette, avec notes et pages sources.',
        'coverage': 'Repères du rapport général PLF 2027, pages 12–13.', 'database_objects': 'dim_contexte',
    },
    {
        'name': 'fact_encours_dette_apu.csv',
        'description': 'Série curatée du stock de dette brute consolidée des administrations publiques, en valeur et en part du PIB.',
        'coverage': '1977–2024; AMECO.', 'database_objects': 'fact_encours_dette_apu',
    },
    {
        'name': 'fact_financement_dette_etat.csv',
        'description': 'Tableau de financement : principal amorti, nominal, indexation, émissions, intérêts payés et charge totale, présentés séparément.',
        'coverage': 'Exécution 2019–2024; données AFT publiées dans le rapport NEB 2024.', 'database_objects': 'fact_financement_dette_etat',
    },
    {
        'name': 'fact_interets_apu.csv',
        'description': 'Série des dépenses d’intérêts des administrations publiques, en valeur et en part du PIB.',
        'coverage': '1978–2024; AMECO.', 'database_objects': 'fact_interets_apu',
    },
    {
        'name': 'fact_mesures_plfss.csv',
        'description': 'Mesures sélectionnées et curatées du PLFSS avec branche, effet, année, article, page et note; lignes non additives.',
        'coverage': '17 mesures; PLFSS_2027_web.pdf.', 'database_objects': 'fact_mesures_plfss',
    },
    {
        'name': 'fact_solde_apu.csv',
        'description': 'Solde net de financement des administrations publiques au sens EDP, en valeur et en part du PIB.',
        'coverage': '1974–2024; AMECO.', 'database_objects': 'fact_solde_apu',
    },
    {
        'name': 'fact_solde_budget_general_etat.csv',
        'description': 'Série INSEE mensuelle ramenée à l’observation de décembre (cumul depuis janvier) pour chaque année complète.',
        'coverage': '2009–2025; INSEE 001717255. Les comptes spéciaux sont publiés séparément.', 'database_objects': 'fact_solde_budget_general_etat',
    },
    {
        'name': 'insee-solde-budget-general-etat.xml',
        'description': 'Export XML source de la série mensuelle INSEE 001717255 sur le solde général d’exécution du budget de l’État.',
        'coverage': 'Série mensuelle archivée; le tableau du dashboard retient décembre 2009–2025.', 'database_objects': 'fact_solde_budget_general_etat',
    },
    {
        'name': 'neb-2024-gestion-dette-tresorerie-etat.pdf',
        'description': 'Rapport de la Cour des comptes sur les résultats et la gestion du budget de l’État en 2024; contient les données AFT sur le financement de la dette.',
        'coverage': 'Tableau de financement 2019–2024; intérêts payés et charge totale publiés pour 2023–2024.', 'database_objects': 'fact_financement_dette_etat',
    },
]


def sql_string(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def read_schema(connection, object_name: str):
    return connection.execute(f'DESCRIBE SELECT * FROM "{object_name}"').fetchall()


def main():
    for name, info in TABLES.items():
        if not info['file'].is_file():
            raise SystemExit(f"Dataset manquant pour {name}: {info['file']}")
    for item in SOURCE_FILES:
        if not (ROOT / 'sources' / item['name']).is_file():
            raise SystemExit(f"Fichier source manquant : {ROOT / 'sources' / item['name']}")

    PUBLIC_DIR = ROOT / 'sqlrooms-dashboard/public'
    database_path = PUBLIC_DIR / 'downloads/comprendrebudget2027.duckdb'
    dictionary_path = PUBLIC_DIR / 'data/data_dictionary.json'
    database_path.parent.mkdir(parents=True, exist_ok=True)
    dictionary_path.parent.mkdir(parents=True, exist_ok=True)
    temp_database = database_path.with_suffix('.tmp.duckdb')
    temp_database.unlink(missing_ok=True)

    connection = duckdb.connect(str(temp_database))
    try:
        for name, info in TABLES.items():
            path = sql_string(str(info['file'].resolve()))
            connection.execute(f'CREATE TABLE "{name}" AS SELECT * FROM read_csv_auto({path})')
        for name, info in VIEWS.items():
            connection.execute(f'CREATE VIEW "{name}" AS {info["sql"]}')
        connection.execute("""
            CREATE TABLE dataset_catalog (
                object_name VARCHAR, object_type VARCHAR, description VARCHAR,
                source VARCHAR, coverage VARCHAR, row_count BIGINT
            )
        """)
        connection.execute("""
            CREATE TABLE column_catalog (
                object_name VARCHAR, ordinal_position INTEGER, column_name VARCHAR,
                data_type VARCHAR, nullable BOOLEAN, description VARCHAR
            )
        """)

        object_docs = {
            **{name: {**info, 'object_type': 'TABLE'} for name, info in TABLES.items()},
            **{name: {**info, 'object_type': 'VIEW'} for name, info in VIEWS.items()},
            **{name: {**info, 'object_type': 'TABLE'} for name, info in CATALOG_TABLES.items()},
        }
        schemas = {name: read_schema(connection, name) for name in object_docs}
        column_rows = []
        dataset_rows = []
        json_catalog = []
        for name, info in object_docs.items():
            columns = []
            for ordinal, (column_name, data_type, nullable, *_rest) in enumerate(schemas[name], start=1):
                description = info['fields'].get(column_name, 'Champ source conservé sans transformation.')
                column_rows.append((name, ordinal, column_name, data_type, nullable == 'YES', description))
                columns.append({
                    'name': column_name,
                    'type': data_type,
                    'nullable': nullable == 'YES',
                    'description': description,
                })
            if name in TABLES or name in VIEWS:
                row_count = connection.execute(f'SELECT count(*) FROM "{name}"').fetchone()[0]
            elif name == 'dataset_catalog':
                row_count = len(object_docs)
            else:
                row_count = len(column_rows)

            dataset_rows.append((name, info['object_type'], info['description'], info['source'], info['coverage'], row_count))
            json_catalog.append({
                'name': name,
                'type': info['object_type'],
                'description': info['description'],
                'source': info['source'],
                'coverage': info['coverage'],
                'rows': row_count,
                'columns': columns,
            })

        connection.executemany('INSERT INTO dataset_catalog VALUES (?, ?, ?, ?, ?, ?)', dataset_rows)
        connection.executemany('INSERT INTO column_catalog VALUES (?, ?, ?, ?, ?, ?)', column_rows)
        connection.execute('CHECKPOINT')
    finally:
        connection.close()

    os.replace(temp_database, database_path)
    dictionary = {
        'database': {
            'file_name': database_path.name,
            'duckdb_python_version': duckdb.__version__,
            'description': 'Tables de données curatées, vues d’analyse et catalogue de schéma du dashboard.',
        },
        'objects': json_catalog,
        'source_files': SOURCE_FILES,
    }
    dictionary_path.write_text(json.dumps(dictionary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'DuckDB prêt : {database_path} ({database_path.stat().st_size:,} octets)')
    print(f'Dictionnaire prêt : {dictionary_path} ({len(json_catalog)} objets)')


if __name__ == '__main__':
    main()
