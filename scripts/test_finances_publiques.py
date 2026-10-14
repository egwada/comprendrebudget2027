"""Contrôles des séries publiques ajoutées au dashboard."""
import csv
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / 'sources'


def read_rows(name):
    with (SOURCES / name).open(newline='', encoding='utf-8') as file:
        return list(csv.DictReader(file))


class PublicFinanceDataTests(unittest.TestCase):
    def test_balance_series_covers_1974_through_2024_and_is_explicitly_apu(self):
        rows = read_rows('fact_solde_apu.csv')
        self.assertEqual([int(row['annee']) for row in rows], list(range(1974, 2025)))
        self.assertTrue(all(row['perimetre'] == 'Administrations publiques' for row in rows))
        self.assertTrue(all(row['source_code'] == 'FRA.1.0.319.0.UBLGE' for row in rows))
        self.assertAlmostEqual(float(rows[0]['solde_pct_pib']), 0.0959, places=4)
        self.assertTrue(all(float(row['solde_pct_pib']) < 0 for row in rows[1:]))
        self.assertEqual(rows[-1]['annee'], '2024')
        self.assertTrue(all(row['unite_montant'] == 'Md ECU/EUR (AMECO)' for row in rows))

    def test_state_general_budget_execution_is_labeled_and_limited_to_2009_2025(self):
        rows = read_rows('fact_solde_budget_general_etat.csv')
        self.assertEqual([int(row['annee']) for row in rows], list(range(2009, 2026)))
        self.assertTrue(all(row['perimetre'] == 'Budget général de l’État' for row in rows))
        self.assertTrue(all(row['source_code'] == 'IDBANK:001717255' for row in rows))
        self.assertAlmostEqual(float(next(r for r in rows if r['annee'] == '2024')['solde_md_eur']), -156.296, places=3)
        self.assertEqual(rows[-1]['observation'], '2025-12')
        self.assertTrue(all(row['unite'] == 'Md€' for row in rows))

    def test_interest_series_keeps_missing_early_years_missing(self):
        rows = read_rows('fact_interets_apu.csv')
        self.assertEqual(rows[0]['annee'], '1978')
        self.assertEqual(rows[-1]['annee'], '2024')
        self.assertTrue(all(float(row['interets_md_eur']) > 0 for row in rows))
        self.assertTrue(all(row['perimetre'] == 'Administrations publiques' for row in rows))
        self.assertTrue(all(row['unite_montant'] == 'Md ECU/EUR (AMECO)' for row in rows))

    def test_state_debt_amortisation_is_separate_and_reconciles(self):
        rows = read_rows('fact_financement_dette_etat.csv')
        self.assertEqual([int(row['annee']) for row in rows], list(range(2019, 2025)))
        self.assertTrue(all(row['statut'] == 'exécution' for row in rows))
        for row in rows:
            self.assertAlmostEqual(
                float(row['amortissement_mlt_md']),
                float(row['remboursement_nominal_md']) + float(row['remboursement_indexation_md']),
                delta=0.11,
            )
            self.assertEqual(row['perimetre'], 'État')
        self.assertEqual(rows[-1]['amortissement_mlt_md'], '155.1')
        self.assertEqual(rows[-1]['emissions_mlt_md'], '285.0')
        self.assertEqual(rows[-1]['interets_payes_md'], '46.5')
        self.assertEqual(rows[-1]['charge_dette_totale_md'], '49.3')
        self.assertEqual(rows[-1]['source_pages'], '6 (intérêts/charge 2023-2024) ; 14-15 (tableau 1 ; pagination imprimée), données AFT')
        self.assertEqual(rows[0]['source_pages'], '14-15 (tableau 1, pagination imprimée), données AFT')
        self.assertEqual(rows[3]['interets_payes_md'], '')
        self.assertTrue(all(row['source_document'] == 'rapport_cour_des_comptes_dette_2024' for row in rows))

    def test_debt_stock_history_is_not_the_principal_repaid(self):
        rows = read_rows('fact_encours_dette_apu.csv')
        self.assertEqual(rows[0]['annee'], '1977')
        self.assertEqual(rows[-1]['annee'], '2024')
        self.assertTrue(all(float(row['encours_md_eur']) > 0 for row in rows))
        self.assertTrue(all(row['perimetre'] == 'Administrations publiques' for row in rows))

    def test_official_original_sources_are_archived(self):
        insee_xml = (SOURCES / 'insee-solde-budget-general-etat.xml').read_bytes()
        self.assertIn(b'IDBANK="001717255"', insee_xml)
        archive = SOURCES / 'ameco0_csv.zip'
        with zipfile.ZipFile(archive) as source:
            self.assertIn('AMECO16.CSV', source.namelist())
            self.assertIn('AMECO18.CSV', source.namelist())
        report = (SOURCES / 'neb-2024-gestion-dette-tresorerie-etat.pdf').read_bytes()
        self.assertTrue(report.startswith(b'%PDF'))
        self.assertGreater(len(report), 100_000)


if __name__ == '__main__':
    unittest.main()
