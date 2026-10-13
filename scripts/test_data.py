"""Régressions sur les données réellement extraites du PDF local."""
import collections
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from extract_budget import extract_budget_pages, build_staging
import pdfplumber


class BudgetDataTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with pdfplumber.open('l17b3210_projet-loi.pdf') as pdf:
            cls.rows = [r for r in extract_budget_pages(pdf)
                        if r['titre'] == 'Récapitulatif général']
        cls.missions, cls.facts = build_staging(cls.rows)

    def test_full_mission_names_and_hierarchy(self):
        totals = {r['mission'] for r in self.rows if r['programme'] == '(total mission)'}
        programs = {r['mission'] for r in self.rows if r['programme'] != '(total mission)'}
        self.assertEqual(totals, programs)
        self.assertEqual(len(totals), 32)
        for name in ('Administration générale et territoriale de l’État',
                     'Gestion des finances publiques et lutte contre les fraudes',
                     'Travail, emploi et administration des ministères sociaux',
                     'Investir pour la France de 2030'):
            self.assertIn(name, totals)

    def test_investir_2030_source_and_programs(self):
        rows = [r for r in self.rows if r['mission'] == 'Investir pour la France de 2030']
        self.assertEqual(len(rows), 6)
        total = next(r for r in rows if r['programme'] == '(total mission)')
        self.assertEqual(total['cp_plf_2027'], 3999870000)
        self.assertEqual(total['source_page'], 309)
        self.assertEqual({r['source_page'] for r in rows}, {309, 310})

    def test_totals_reconcile_with_programs(self):
        for col in ('ae_lfi_2026', 'ae_plf_2027', 'cp_lfi_2026', 'cp_plf_2027'):
            totals, programs = {}, collections.defaultdict(int)
            for r in self.rows:
                if r['programme'] == '(total mission)':
                    totals[r['mission']] = r[col]
                else:
                    programs[r['mission']] += r[col]
            self.assertEqual(totals, dict(programs), col)

    def test_fact_contract_and_no_duplicates(self):
        keys = [(r['mission'], r['programme'], r['type_credit'], r['annee']) for r in self.facts]
        self.assertEqual(len(keys), len(set(keys)))
        for r in self.facts:
            self.assertIsInstance(r['montant'], int)
            self.assertGreaterEqual(r['montant'], 0)
            self.assertEqual(r['scope'], 'budget_general')
            self.assertEqual(r['nature'], 'credits_prevus')
            self.assertEqual(r['unite'], 'EUR')
            self.assertEqual(r['source_document'], 'l17b3210_projet-loi.pdf')


if __name__ == '__main__':
    unittest.main()
