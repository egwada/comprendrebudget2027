import { lazy, Suspense, useEffect, useState } from 'react';
import { query } from '../duckdb';
import { fmtEUR, evolutionLabel } from '../lib/format';
import type { View } from '../lib/views';

const HomeBudgetTreemap = lazy(() => import('./HomeBudgetTreemap'));

interface HomeKPI {
  label: string;
  value: string;
  sub: string;
  year: string;
  perimeter: string;
  status: string;
  source: string;
  target: View;
}

export default function Home({ onNavigate }: { onNavigate: (v: View) => void }) {
  const [kpis, setKpis] = useState<HomeKPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      query<{ y2026: number; y2027: number }>(`
        SELECT
          SUM(CASE WHEN annee = 2026 THEN montant ELSE 0 END)::DOUBLE AS y2026,
          SUM(CASE WHEN annee = 2027 THEN montant ELSE 0 END)::DOUBLE AS y2027
        FROM fact_credits
        WHERE programme = '(total mission)' AND type_credit = 'CP' AND scope = 'budget_general'
      `),
      query<{ annee: number; solde_md_eur: number }>(`
        SELECT annee, solde_md_eur
        FROM fact_solde_budget_general_etat
        ORDER BY annee DESC
        LIMIT 1
      `),
      query<{ annee: number; encours_md_eur: number; encours_pct_pib: number }>(`
        SELECT annee, encours_md_eur, encours_pct_pib
        FROM fact_encours_dette_apu
        ORDER BY annee DESC
        LIMIT 1
      `),
      query<{ annee: number; interets_md_eur: number; interets_pct_pib: number }>(`
        SELECT annee, interets_md_eur, interets_pct_pib
        FROM fact_interets_apu
        ORDER BY annee DESC
        LIMIT 1
      `),
      query<{ annee: number; amortissement_mlt_md: number }>(`
        SELECT annee, amortissement_mlt_md
        FROM fact_financement_dette_etat
        ORDER BY annee DESC
        LIMIT 1
      `),
    ])
      .then(([cp, solde, dette, interets, financing]) => {
        if (cancelled) return;
        const cpRow = cp[0] ?? { y2026: 0, y2027: 0 };
        const soldeRow = solde[0];
        const detteRow = dette[0];
        const interetsRow = interets[0];
        const financingRow = financing[0];

        const items: HomeKPI[] = [
          {
            label: 'Crédits de paiement prévus pour le budget général',
            value: fmtEUR(cpRow.y2027),
            sub: `Évolution vs 2026 : ${evolutionLabel(cpRow.y2026, cpRow.y2027)}`,
            year: '2027',
            perimeter: 'Budget général de l’État',
            status: 'prévision (simulée)',
            source: 'Assemblée nationale · PLF 2027, pp. 307–313',
            target: 'budget',
          },
        ];

        if (soldeRow) {
          items.push({
            label: 'Dernier solde exécuté du budget général de l’État',
            value: `${soldeRow.solde_md_eur.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Md€`,
            sub: 'Solde cumulé à décembre, INSEE',
            year: String(soldeRow.annee),
            perimeter: 'Budget général de l’État',
            status: 'exécuté',
            source: 'INSEE · série 001717255',
            target: 'dette',
          });
        }

        if (detteRow) {
          items.push({
            label: 'Encours de dette des administrations publiques',
            value: `${detteRow.encours_md_eur.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Md ECU/EUR`,
            sub: `${detteRow.encours_pct_pib.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} % du PIB`,
            year: String(detteRow.annee),
            perimeter: 'Administrations publiques',
            status: 'exécution (série révisable)',
            source: 'Commission européenne · AMECO',
            target: 'dette',
          });
        }

        if (interetsRow) {
          items.push({
            label: 'Dépenses d’intérêts des administrations publiques',
            value: `${interetsRow.interets_md_eur.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Md ECU/EUR`,
            sub: `${interetsRow.interets_pct_pib.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} % du PIB`,
            year: String(interetsRow.annee),
            perimeter: 'Administrations publiques',
            status: 'exécution (série révisable)',
            source: 'Commission européenne · AMECO',
            target: 'dette',
          });
        }

        if (financingRow) {
          items.push({
            label: 'Principal de dette de l’État amorti à moyen et long terme',
            value: `${financingRow.amortissement_mlt_md.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Md€`,
            sub: 'Rapport de la Cour des comptes 2024 · données AFT, pp. 14–15',
            year: String(financingRow.annee),
            perimeter: 'État',
            status: 'exécuté',
            source: 'Cour des comptes · AFT',
            target: 'dette',
          });
        }

        setKpis(items);
        setLoading(false);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p role="status">Chargement des agrégats…</p>;
  if (error) return <p role="alert">Données indisponibles : {error}</p>;

  return (
    <div className="home-view">
      <h2 className="section-title">Aperçu des finances publiques</h2>
      <p className="home-intro">
        Chaque repère mène aux données détaillées. Les prévisions du projet 2027 sont distinguées
        des exécutions historiques ; chaque carte précise l’année, le périmètre, le statut et la
        source du chiffre.
      </p>
      <div className="home-grid">
        {kpis.map((kpi) => (
          <a
            key={kpi.label}
            className="home-card"
            href={`?vue=${kpi.target}`}
            onClick={(e) => {
              if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              e.preventDefault();
              onNavigate(kpi.target);
            }}
          >
            <span className="home-card-meta">
              {kpi.year} · {kpi.perimeter} · {kpi.status} · {kpi.source}
            </span>
            <span className="home-card-value">{kpi.value}</span>
            <span className="home-card-label">{kpi.label}</span>
            <span className="home-card-sub">{kpi.sub}</span>
          </a>
        ))}
      </div>
      <Suspense fallback={<p role="status">Chargement du treemap budgétaire…</p>}>
        <HomeBudgetTreemap />
      </Suspense>
    </div>
  );
}
