import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { query } from '../duckdb';
import { downloadCsv } from '../lib/csv';
import { publicUrl } from '../lib/publicUrl';

interface BalanceRow {
  annee: number;
  solde_md_eur: number;
  solde_pct_pib: number;
  perimetre: string;
  statut: string;
  source_code: string;
  source_url: string;
  version_source: string;
}

interface StateBudgetBalanceRow {
  annee: number;
  solde_md_eur: number;
  unite: string;
  perimetre: string;
  nature: string;
  statut: string;
  observation: string;
  source_code: string;
  source_url: string;
  version_source: string;
  note: string;
}

interface InterestRow {
  annee: number;
  interets_md_eur: number;
  interets_pct_pib: number;
  perimetre: string;
  statut: string;
  source_code: string;
  source_url: string;
  version_source: string;
}

interface DebtStockRow {
  annee: number;
  encours_md_eur: number;
  encours_pct_pib: number;
  perimetre: string;
  statut: string;
  source_code: string;
  source_url: string;
  version_source: string;
}

interface FinancingRow {
  annee: number;
  amortissement_mlt_md: number;
  remboursement_nominal_md: number;
  remboursement_indexation_md: number;
  amortissement_dette_sncf_md: number;
  amortissement_autres_dettes_md: number;
  deficit_budgetaire_md: number;
  emissions_mlt_md: number;
  charge_dette_totale_md: number | null;
  interets_payes_md: number | null;
  source_document: string;
  source_pages: string;
  source_url: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: number | string;
}

const number = (value: number, digits = 1) =>
  Number(value).toLocaleString('fr-FR', { maximumFractionDigits: digits });
const md = (value: number | null | undefined) =>
  value == null || !Number.isFinite(Number(value)) ? '—' : `${number(Number(value))} Md€`;
const amecoMd = (value: number | null | undefined) =>
  value == null || !Number.isFinite(Number(value)) ? '—' : `${number(Number(value))} Md ECU/EUR`;
const pct = (value: number) => `${number(value, 2)} % du PIB`;

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tt">
      <b>{label}</b>
      <br />
      {number(payload[0].value, 2)} % du PIB
    </div>
  );
}

function BudgetAmountTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tt">
      <b>{label}</b>
      <br />
      {md(payload[0].value)}
    </div>
  );
}

function AmountTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tt">
      <b>{label}</b>
      <br />
      {amecoMd(payload[0].value)}
    </div>
  );
}

function SourceTable<T extends { annee: number }>({
  rows,
  columns,
}: {
  rows: T[];
  columns: { key: keyof T; title: string; render?: (row: T) => string }[];
}) {
  return (
    <details className="finance-data-table">
      <summary>Afficher les valeurs sous forme de tableau</summary>
      <div
        className="tbl-wrap"
        role="region"
        aria-label="Tableau des séries historiques avec défilement si nécessaire"
        tabIndex={0}
      >
        <table className="tbl">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)} scope="col">
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.annee}>
                {columns.map((column) => (
                  <td key={String(column.key)}>
                    {column.render ? column.render(row) : String(row[column.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export default function SoldeEtDette() {
  const [balance, setBalance] = useState<BalanceRow[]>([]);
  const [stateBudgetBalance, setStateBudgetBalance] = useState<StateBudgetBalanceRow[]>([]);
  const [interest, setInterest] = useState<InterestRow[]>([]);
  const [debtStock, setDebtStock] = useState<DebtStockRow[]>([]);
  const [financing, setFinancing] = useState<FinancingRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      query<BalanceRow>('SELECT * FROM fact_solde_apu ORDER BY annee'),
      query<StateBudgetBalanceRow>('SELECT * FROM fact_solde_budget_general_etat ORDER BY annee'),
      query<InterestRow>('SELECT * FROM fact_interets_apu ORDER BY annee'),
      query<DebtStockRow>('SELECT * FROM fact_encours_dette_apu ORDER BY annee'),
      query<FinancingRow>('SELECT * FROM fact_financement_dette_etat ORDER BY annee'),
    ])
      .then(([balanceRows, stateBalanceRows, interestRows, debtRows, financingRows]) => {
        if (!cancelled) {
          setBalance(balanceRows);
          setStateBudgetBalance(stateBalanceRows);
          setInterest(interestRows);
          setDebtStock(debtRows);
          setFinancing(financingRows);
          setError('');
        }
      })
      .catch((reason) => {
        if (!cancelled) setError(String(reason));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const lastNonDeficit = [...balance].reverse().find((row) => row.solde_pct_pib >= 0);
  const allLaterYearsDeficit = lastNonDeficit
    ? balance
        .filter((row) => row.annee > lastNonDeficit.annee)
        .every((row) => row.solde_pct_pib < 0)
    : false;
  const sourceVersion = balance[0]?.version_source;
  const inseeVersion = stateBudgetBalance[0]?.version_source;

  return (
    <section className="panel debt-balance" aria-labelledby="debt-balance-title">
      <h2 id="debt-balance-title" className="section-title">
        Soldes publics et dette : contexte historique
      </h2>
      <p className="note">
        Ces séries distinguent le solde des administrations publiques, les intérêts, l’encours de
        dette et le financement de la dette de l’État. Elles ne sont pas additionnées aux crédits
        prévus du prototype PLF 2027.
      </p>
      {error && <p role="alert">Les séries historiques ne sont pas disponibles : {error}</p>}
      {!balance.length && !error && <p role="status">Chargement des séries historiques…</p>}

      {balance.length > 0 && (
        <section aria-labelledby="historical-balance-title">
          <h3 id="historical-balance-title">Solde annuel des administrations publiques</h3>
          <p className="hint">
            Solde net de financement au sens de la procédure de déficit excessif, en pourcentage du
            PIB. Périmètre : État, collectivités locales et Sécurité sociale. Ce n’est donc pas le
            seul budget de l’État.
          </p>
          {lastNonDeficit && allLaterYearsDeficit && (
            <p className="finance-finding">
              Dans cette série, le dernier solde non déficitaire est celui de {lastNonDeficit.annee}{' '}
              ({pct(lastNonDeficit.solde_pct_pib)}). Les observations suivantes jusqu’en{' '}
              {balance[balance.length - 1].annee} sont négatives.
            </p>
          )}
          <div
            className="finance-chart"
            role="img"
            aria-label={`Solde des administrations publiques, en pourcentage du PIB, de ${balance[0].annee} à ${balance[balance.length - 1].annee}. Les valeurs détaillées sont disponibles dans le tableau qui suit.`}
          >
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={balance} margin={{ top: 12, right: 22, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="annee" interval={4} tick={{ fontSize: 11 }} />
                <YAxis
                  domain={['auto', 'auto']}
                  tickFormatter={(value: number) => `${number(value, 0)} %`}
                  width={52}
                />
                <ReferenceLine y={0} stroke="#525260" strokeWidth={2} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="solde_pct_pib" name="Solde (% du PIB)" fill="#3157a4" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="finance-source">
            Source : Commission européenne, base AMECO, code FRA.1.0.319.0.UBLGE ; version du{' '}
            {sourceVersion}. Série susceptible d’être révisée.{' '}
            <a
              href={balance[0]?.source_url}
              target="_blank"
              rel="noreferrer"
            >
              Ouvrir AMECO (nouvel onglet)
            </a>
          </p>
          <SourceTable
            rows={balance}
            columns={[
              { key: 'annee', title: 'Année' },
              { key: 'solde_md_eur', title: 'Solde (Md ECU/EUR)', render: (row) => amecoMd(row.solde_md_eur) },
              { key: 'solde_pct_pib', title: 'Solde (% PIB)', render: (row) => pct(row.solde_pct_pib) },
            ]}
          />
          <button
            className="export-btn"
            onClick={() => downloadCsv('solde-administrations-publiques.csv', balance.map((row) => ({ ...row })))}
          >
            Télécharger la série du solde public (CSV sourcé)
          </button>
        </section>
      )}

      <div className="finance-chart-grid">
        {stateBudgetBalance.length > 0 && (
          <section className="finance-chart-panel" aria-labelledby="state-balance-title">
            <h3 id="state-balance-title">Solde exécuté du budget général de l’État</h3>
            <p className="hint">
              Valeur de décembre du solde cumulé depuis janvier, en Md€ courants. La série INSEE
              disponible ici couvre 2009–2025 ; elle ne permet pas de remonter jusqu’en 1974 et les
              comptes spéciaux sont publiés à part. L’année 2026, incomplète, n’est pas incluse.
            </p>
            <div
              className="finance-chart"
              role="img"
              aria-label={`Solde exécuté du budget général de l’État de ${stateBudgetBalance[0].annee} à ${stateBudgetBalance[stateBudgetBalance.length - 1].annee}, en milliards d’euros. Les valeurs détaillées sont dans le tableau qui suit.`}
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stateBudgetBalance} margin={{ top: 12, right: 12, bottom: 4, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="annee" interval={2} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(value: number) => number(value, 0)} width={48} />
                  <ReferenceLine y={0} stroke="#525260" strokeWidth={2} />
                  <Tooltip content={<BudgetAmountTooltip />} />
                  <Bar dataKey="solde_md_eur" name="Solde exécuté (Md€)" fill="#3157a4" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="finance-source">
              Source : INSEE, série 001717255, dernière mise à jour {inseeVersion}.{' '}
              <a href={stateBudgetBalance[0]?.source_url} target="_blank" rel="noreferrer">
                Consulter la série (nouvel onglet)
              </a>
            </p>
            <SourceTable
              rows={stateBudgetBalance}
              columns={[
                { key: 'annee', title: 'Année' },
                { key: 'solde_md_eur', title: 'Solde exécuté (Md€)', render: (row) => md(row.solde_md_eur) },
              ]}
            />
            <button
              className="export-btn"
              onClick={() => downloadCsv('solde-budget-general-etat-insee.csv', stateBudgetBalance.map((row) => ({ ...row })))}
            >
              Télécharger le solde exécuté de l’État (CSV sourcé)
            </button>
          </section>
        )}

        {interest.length > 0 && (
          <section className="finance-chart-panel" aria-labelledby="interest-title">
            <h3 id="interest-title">Dépenses d’intérêts des administrations publiques</h3>
            <p className="hint">
              Dépense d’intérêts au sens des comptes nationaux, en Md ECU/EUR courants selon l’unité AMECO. Les premières
              années pour lesquelles AMECO fournit une valeur sont affichées ; les années antérieures
              ne sont pas assimilées à zéro.
            </p>
            <div
              className="finance-chart"
              role="img"
              aria-label={`Dépenses d’intérêts des administrations publiques de ${interest[0].annee} à ${interest[interest.length - 1].annee}, en Md ECU/EUR selon l’unité AMECO. Les valeurs détaillées sont disponibles dans le tableau qui suit.`}
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={interest} margin={{ top: 12, right: 12, bottom: 4, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="annee" interval={5} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(value: number) => number(value, 0)} width={42} />
                  <Tooltip content={<AmountTooltip />} />
                  <Bar dataKey="interets_md_eur" name="Intérêts (Md ECU/EUR)" fill="#3157a4" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="finance-source">
              Source : Commission européenne, base AMECO, code FRA.1.0.99.0.UYIGE ; même périmètre
              APU, définition comptable, série révisable.
            </p>
            <SourceTable
              rows={interest}
              columns={[
                { key: 'annee', title: 'Année' },
                { key: 'interets_md_eur', title: 'Intérêts (Md ECU/EUR)', render: (row) => amecoMd(row.interets_md_eur) },
                { key: 'interets_pct_pib', title: 'Intérêts (% PIB)', render: (row) => pct(row.interets_pct_pib) },
              ]}
            />
            <button
              className="export-btn"
              onClick={() => downloadCsv('interets-administrations-publiques.csv', interest.map((row) => ({ ...row })))}
            >
              Télécharger les intérêts (CSV sourcé)
            </button>
          </section>
        )}

        {debtStock.length > 0 && (
          <section className="finance-chart-panel finance-debt-panel" aria-labelledby="debt-stock-title">
            <h3 id="debt-stock-title">Encours de dette des administrations publiques</h3>
            <p className="hint">
              Stock de dette brute consolidée en fin d’année. L’encours est distinct du montant de
              principal remboursé au cours de l’année.
            </p>
            <div className="finance-debt-chart-pair">
              <div className="finance-debt-chart">
                <h4 id="debt-stock-amount-title">Encours en Md ECU/EUR</h4>
                <div
                  className="finance-chart"
                  role="img"
                  aria-label={`Encours de dette brute des administrations publiques de ${debtStock[0].annee} à ${debtStock[debtStock.length - 1].annee}, en Md ECU/EUR selon l’unité AMECO. Les valeurs détaillées sont disponibles dans le tableau qui suit.`}
                >
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={debtStock} margin={{ top: 12, right: 12, bottom: 4, left: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="annee" interval={5} tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(value: number) => number(value, 0)} width={48} />
                      <Tooltip content={<AmountTooltip />} />
                      <Bar dataKey="encours_md_eur" name="Encours (Md ECU/EUR)" fill="#3157a4" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="finance-debt-chart">
                <h4 id="debt-stock-gdp-title">Encours rapporté au PIB</h4>
                <p className="hint">Part de la dette brute consolidée dans le PIB annuel.</p>
                <div
                  className="finance-chart"
                  role="img"
                  aria-label={`Encours de dette brute des administrations publiques rapporté au PIB de ${debtStock[0].annee} à ${debtStock[debtStock.length - 1].annee}. Les valeurs détaillées sont dans le tableau qui suit.`}
                >
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={debtStock} margin={{ top: 12, right: 12, bottom: 4, left: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="annee" interval={5} tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(value: number) => `${number(value, 0)} %`} width={52} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="encours_pct_pib" name="Encours (% du PIB)" fill="#3157a4" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <p className="finance-source">
              Source : Commission européenne, base AMECO, code FRA.1.0.99.0.UDGGL ; série
              historique liée, révisable.
            </p>
            <SourceTable
              rows={debtStock}
              columns={[
                { key: 'annee', title: 'Année' },
                { key: 'encours_md_eur', title: 'Encours (Md ECU/EUR)', render: (row) => amecoMd(row.encours_md_eur) },
                { key: 'encours_pct_pib', title: 'Encours (% PIB)', render: (row) => pct(row.encours_pct_pib) },
              ]}
            />
            <button
              className="export-btn"
              onClick={() => downloadCsv('encours-dette-administrations-publiques.csv', debtStock.map((row) => ({ ...row })))}
            >
              Télécharger l’encours (CSV sourcé)
            </button>
          </section>
        )}
      </div>

      {financing.length > 0 && (
        <section aria-labelledby="repayment-title">
          <h3 id="repayment-title">Remboursement et refinancement de la dette de l’État</h3>
          <p className="hint">
            Les remboursements de principal sont des opérations de financement : ils sont distincts
            des intérêts et ne s’ajoutent pas aux dépenses ordinaires du budget. Les émissions
            indiquent le financement de la dette à moyen et long terme ; elles ne sont pas un revenu
            fiscal.
          </p>
          <p className="finance-finding">
            En 2024, le rapport de la Cour des comptes indique {md(financing[financing.length - 1].interets_payes_md)}
            {' '}d’intérêts payés, {md(financing[financing.length - 1].charge_dette_totale_md)}
            {' '}de charge totale de la dette et {md(financing[financing.length - 1].amortissement_mlt_md)}
            {' '}d’amortissement de dette à moyen et long terme. Ce ne sont ni la même nature ni le
            même traitement comptable.
          </p>
          <div
            className="tbl-wrap"
            role="region"
            aria-label="Tableau de financement avec défilement horizontal"
            tabIndex={0}
          >
            <table className="tbl finance-financing-table">
              <thead>
                <tr>
                  <th scope="col">Année</th>
                  <th scope="col">Principal MLT amorti</th>
                  <th scope="col">Dont nominal remboursé</th>
                  <th scope="col">Dont indexation</th>
                  <th scope="col">Intérêts payés</th>
                  <th scope="col">Charge totale de la dette</th>
                  <th scope="col">Émissions MLT nettes des rachats</th>
                </tr>
              </thead>
              <tbody>
                {financing.map((row) => (
                  <tr key={row.annee}>
                    <td>{row.annee}</td>
                    <td>{md(row.amortissement_mlt_md)}</td>
                    <td>{md(row.remboursement_nominal_md)}</td>
                    <td>{md(row.remboursement_indexation_md)}</td>
                    <td>{md(row.interets_payes_md)}</td>
                    <td>{md(row.charge_dette_totale_md)}</td>
                    <td>{md(row.emissions_mlt_md)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="finance-source">
            Source : Cour des comptes, <i>Le budget de l’État en 2024 — Résultats et gestion</i>,
            synthèse p. 6 et tableau 1, p. 14–15 (pagination imprimée), données AFT. Les valeurs
            d’intérêts et de charge totale ne sont publiées ici que pour 2023 et 2024 ; les cases antérieures restent
            vides et ne valent pas zéro.{' '}
            <a href={publicUrl('sources/neb-2024-gestion-dette-tresorerie-etat.pdf')} target="_blank" rel="noreferrer">
              Consulter le rapport source (PDF, nouvel onglet)
            </a>
          </p>
          <SourceTable
            rows={financing}
            columns={[
              { key: 'annee', title: 'Année' },
              { key: 'amortissement_mlt_md', title: 'Principal MLT amorti (Md€)', render: (row) => md(row.amortissement_mlt_md) },
              { key: 'remboursement_nominal_md', title: 'Nominal remboursé (Md€)', render: (row) => md(row.remboursement_nominal_md) },
              { key: 'remboursement_indexation_md', title: 'Indexation (Md€)', render: (row) => md(row.remboursement_indexation_md) },
              { key: 'interets_payes_md', title: 'Intérêts payés (Md€)', render: (row) => md(row.interets_payes_md) },
              { key: 'charge_dette_totale_md', title: 'Charge totale (Md€)', render: (row) => md(row.charge_dette_totale_md) },
              { key: 'emissions_mlt_md', title: 'Émissions MLT nettes des rachats (Md€)', render: (row) => md(row.emissions_mlt_md) },
            ]}
          />
          <button
            className="export-btn"
            onClick={() => downloadCsv('financement-dette-etat.csv', financing.map((row) => ({ ...row })))}
          >
            Télécharger les flux de financement (CSV sourcé)
          </button>
        </section>
      )}
    </section>
  );
}
