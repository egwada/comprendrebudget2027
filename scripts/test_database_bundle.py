#!/usr/bin/env python3
"""Checks the downloadable DuckDB artifact and its embedded schema catalogue."""
import json
import unittest
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parents[1]
DATABASE = ROOT / 'sqlrooms-dashboard/public/downloads/comprendrebudget2027.duckdb'
DICTIONARY = ROOT / 'sqlrooms-dashboard/public/data/data_dictionary.json'
EXPECTED_DATA_TABLES = {
    'fact_credits', 'dim_contexte', 'fact_mesures_plfss', 'fact_solde_apu',
    'fact_solde_budget_general_etat', 'fact_interets_apu', 'fact_encours_dette_apu',
    'fact_financement_dette_etat',
}
EXPECTED_VIEWS = {
    'v_missions_cp_2027', 'v_missions_cp_2026', 'v_compare_missions',
    'v_programs', 'v_qualite',
}
EXPECTED_SOURCE_FILES = {
    'ameco0_csv.zip', 'dim_contexte.csv', 'fact_encours_dette_apu.csv',
    'fact_financement_dette_etat.csv', 'fact_interets_apu.csv', 'fact_mesures_plfss.csv',
    'fact_solde_apu.csv', 'fact_solde_budget_general_etat.csv',
    'insee-solde-budget-general-etat.xml', 'neb-2024-gestion-dette-tresorerie-etat.pdf',
}


class DownloadableDatabaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not DATABASE.is_file() or not DICTIONARY.is_file():
            raise RuntimeError('Build first: run scripts/build_database.py')
        cls.connection = duckdb.connect(str(DATABASE), read_only=True)
        cls.dictionary = json.loads(DICTIONARY.read_text(encoding='utf-8'))

    @classmethod
    def tearDownClass(cls):
        cls.connection.close()

    def test_data_tables_and_views_are_present(self):
        objects = {row[0] for row in self.connection.execute('SHOW TABLES').fetchall()}
        self.assertTrue(EXPECTED_DATA_TABLES.issubset(objects))
        self.assertTrue(EXPECTED_VIEWS.issubset(objects))
        self.assertTrue({'dataset_catalog', 'column_catalog'}.issubset(objects))

    def test_key_table_row_counts_and_queries(self):
        self.assertEqual(self.connection.execute('SELECT count(*) FROM fact_credits').fetchone()[0], 668)
        self.assertEqual(self.connection.execute('SELECT count(*) FROM dim_contexte').fetchone()[0], 6)
        self.assertEqual(self.connection.execute('SELECT count(*) FROM fact_mesures_plfss').fetchone()[0], 17)
        self.assertEqual(self.connection.execute('SELECT count(*) FROM v_missions_cp_2027').fetchone()[0], 32)
        self.assertEqual(self.connection.execute('SELECT count(*) FROM v_programs').fetchone()[0], 135)

    def test_documented_columns_have_types_and_meanings(self):
        fields = self.connection.execute(
            "SELECT column_name, data_type, description FROM column_catalog "
            "WHERE object_name='fact_credits' ORDER BY ordinal_position"
        ).fetchall()
        self.assertEqual(len(fields), 12)
        self.assertIn(('montant', 'BIGINT'), [(name, kind) for name, kind, _ in fields])
        self.assertTrue(all(description.strip() for _, _, description in fields))

    def test_missing_financing_values_remain_null(self):
        missing = self.connection.execute(
            'SELECT count(*) FROM fact_financement_dette_etat '
            'WHERE annee <= 2022 AND (interets_payes_md IS NULL OR charge_dette_totale_md IS NULL)'
        ).fetchone()[0]
        self.assertGreater(missing, 0)

    def test_dictionary_documents_source_archive_files(self):
        names = {item['name'] for item in self.dictionary['source_files']}
        self.assertEqual(names, EXPECTED_SOURCE_FILES)
        self.assertGreaterEqual(len(self.dictionary['objects']), 15)
        self.assertTrue(all(obj.get('columns') for obj in self.dictionary['objects']))


if __name__ == '__main__':
    unittest.main()
