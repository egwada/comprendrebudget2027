import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, Tooltip, Treemap } from 'recharts';
import type { TreemapNode } from 'recharts';
import { query } from '../duckdb';
import { buildBudgetTreemap, missionTreemapColor, programTreemapColor, type BudgetCreditRow } from '../lib/budgetTreemap';
import { fmtEUR, labelColorFor, truncate } from '../lib/format';

interface ChartNode extends TreemapNode {
  mission?: string;
  programme?: string;
  amount?: number;
}

function TreemapCell(node: ChartNode) {
  const { x, y, width, height, depth, index } = node;
  if (depth === 0 || width <= 0 || height <= 0) return <g />;

  const mission = node.mission ?? node.name;
  const baseColor = missionTreemapColor(mission);
  if (depth === 1) {
    return (
      <g className="home-treemap-mission">
        <rect x={x} y={y} width={width} height={height} fill={baseColor} stroke="#fff" strokeWidth={2} />
      </g>
    );
  }

  const program = node.programme ?? node.name;
  const background = programTreemapColor(mission, index);
  const textColor = labelColorFor(background);
  return (
    <g className="home-treemap-program">
      <rect x={x} y={y} width={width} height={height} fill={background} stroke="#fff" strokeWidth={1} />
      {width > 86 && height > 26 && (
        <text x={x + 5} y={y + 16} fill={textColor} fontSize={10}>
          {truncate(program, 25)}
        </text>
      )}
    </g>
  );
}

function TreemapTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as ChartNode;
  const mission = row.mission ?? row.name;
  return (
    <div className="tt">
      {row.programme ? (
        <>
          <b>{row.programme}</b>
          <div>{mission}</div>
          <div>CP prévus en 2027 : <b>{fmtEUR(row.amount ?? row.value)}</b></div>
        </>
      ) : (
        <>
          <b>{mission}</b>
          <div>Total publié en CP 2027 : <b>{fmtEUR(row.amount ?? row.value)}</b></div>
        </>
      )}
    </div>
  );
}

export default function HomeBudgetTreemap() {
  const [rows, setRows] = useState<BudgetCreditRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    query<BudgetCreditRow>(`
      SELECT mission, programme, SUM(montant)::DOUBLE AS montant
      FROM fact_credits
      WHERE scope = 'budget_general' AND type_credit = 'CP' AND annee = 2027
      GROUP BY mission, programme
    `)
      .then((data) => {
        if (!cancelled) {
          setRows(data);
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

  const tree = useMemo(() => buildBudgetTreemap(rows), [rows]);
  const programs = useMemo(
    () => rows.filter((row) => row.programme !== '(total mission)')
      .sort((a, b) => a.mission.localeCompare(b.mission, 'fr') || a.programme.localeCompare(b.programme, 'fr')),
    [rows]
  );

  return (
    <section className="panel home-budget-treemap" aria-labelledby="home-treemap-title">
      <h2 id="home-treemap-title">Comment les crédits prévus se répartissent-ils entre missions et programmes ?</h2>
      <p className="hint">
        Chaque grand bloc représente une mission ; ses rectangles intérieurs représentent les
        programmes. La surface représente les crédits de paiement (CP) prévus pour 2027. Une même
        famille de teintes correspond à une mission, les nuances distinguent ses programmes.
      </p>
      {error && <p role="alert">Le treemap budgétaire est indisponible : {error}</p>}
      {!tree.length && !error ? (
        <p role="status">Chargement du treemap budgétaire…</p>
      ) : tree.length > 0 ? (
        <>
          <div
            className="home-budget-treemap-chart"
            role="img"
            aria-label="Treemap des crédits de paiement du budget général prévus en 2027, regroupés par mission puis par programme. Les montants exacts sont disponibles dans le tableau qui suit."
          >
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={tree}
                dataKey="size"
                nameKey="name"
                content={(node) => <TreemapCell {...(node as ChartNode)} />}
                nodeInset={3}
                nodeGap={2}
                isAnimationActive={false}
              >
                <Tooltip content={<TreemapTooltip />} />
              </Treemap>
            </ResponsiveContainer>
          </div>
          <p className="finance-source">
            Source : document PLF 2027 de l’Assemblée nationale, récapitulatif général, pages 307–313.{' '}
            <a href="/sources/l17b3210_projet-loi.pdf#page=307" target="_blank" rel="noreferrer">
              Ouvrir le PDF source (nouvel onglet)
            </a>
            . La taille des programmes est répartie proportionnellement à leurs montants pour
            préserver le total publié de chaque mission.
          </p>
          <details className="home-treemap-legend">
            <summary>Afficher les couleurs des missions</summary>
            <ul>
              {tree.map((mission) => (
                <li key={mission.mission}>
                  <span aria-hidden="true" style={{ backgroundColor: missionTreemapColor(mission.mission) }} />
                  {mission.mission}
                </li>
              ))}
            </ul>
          </details>
          <details className="home-treemap-values">
            <summary>Afficher les montants exacts des programmes (tableau)</summary>
            <div className="tbl-wrap" role="region" aria-label="Montants CP 2027 par mission et programme" tabIndex={0}>
              <table className="home-treemap-table">
                <caption>Crédits de paiement prévus pour 2027, budget général, en euros. Les totaux de mission ne sont pas ajoutés aux programmes.</caption>
                <thead>
                  <tr>
                    <th scope="col">Mission</th>
                    <th scope="col">Programme</th>
                    <th scope="col">CP 2027</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map((row) => (
                    <tr key={`${row.mission}-${row.programme}`}>
                      <td>{row.mission}</td>
                      <td>{row.programme}</td>
                      <td className="num">{fmtEUR(row.montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      ) : null}
    </section>
  );
}
