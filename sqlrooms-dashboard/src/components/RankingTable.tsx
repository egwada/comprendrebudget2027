import { useMemo, useState } from 'react';
import type { MissionRow } from './Dashboard';
import { fmtEUR, evolutionLabel, evolutionPct } from '../lib/format';
import { columnLabels, debtDetailCue, debtMissionName } from '../lib/labels';
import { plfPageUrl } from '../lib/sourceLinks';

interface Props {
  data: MissionRow[];
  totalRef: number;
  kind: 'missions' | 'programmes';
  onSelect?: (name: string) => void;
}
type SortKey = 'name' | 'y2026' | 'y2027' | 'evol' | 'share';

export default function RankingTable({ data, totalRef, kind, onSelect }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('y2027');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const rows = useMemo(
    () =>
      data
        .map((r) => ({
          ...r,
          evol: evolutionPct(r.y2026, r.y2027),
          share: totalRef ? (r.y2027 / totalRef) * 100 : 0,
        }))
        .sort((a, b) => {
          const s = dir === 'asc' ? 1 : -1;
          if (sortKey === 'name') return a.mission.localeCompare(b.mission, 'fr') * s;
          const av = sortKey === 'evol' ? (a.evol ?? -Infinity) : a[sortKey];
          const bv = sortKey === 'evol' ? (b.evol ?? -Infinity) : b[sortKey];
          return av === bv ? 0 : (av > bv ? 1 : -1) * s;
        }),
    [data, totalRef, sortKey, dir]
  );
  const toggle = (key: SortKey) => {
    if (key === sortKey) setDir(dir === 'desc' ? 'asc' : 'desc');
    else {
      setSortKey(key);
      setDir(key === 'name' ? 'asc' : 'desc');
    }
  };
  const cols: [SortKey, string][] = [
    ['name', kind === 'missions' ? columnLabels.mission : columnLabels.programme],
    ['y2026', columnLabels.y2026],
    ['y2027', columnLabels.y2027],
    ['evol', columnLabels.evol],
    ['share', columnLabels.share],
  ];
  const total26 = data.reduce((s, r) => s + r.y2026, 0);
  const total27 = data.reduce((s, r) => s + r.y2027, 0);
  const change = (r: MissionRow) => (
    <span className={`badge ${r.y2027 > r.y2026 ? 'up' : r.y2027 < r.y2026 ? 'down' : 'zero'}`}>
      {evolutionLabel(r.y2026, r.y2027)}
    </span>
  );
  return (
    <div
      className="tbl-wrap"
      tabIndex={0}
      role="region"
      aria-label={`Tableau des ${kind === 'missions' ? 'domaines d’action' : 'programmes'}, défilement horizontal possible`}
    >
      <table className="tbl">
        <caption>
          Montants prévus en euros par {kind === 'missions' ? 'domaine (appelé « mission » dans le budget)' : 'programme'}.
          Md€ signifie milliards d’euros et M€ millions d’euros. La part indique la proportion des crédits affichés{' '}
          {kind === 'missions' ? 'dans le tableau' : 'au sein de cette mission'} ; l’évolution compare les montants de 2027 à ceux votés en 2026.
        </caption>
        <thead>
          <tr>
            {cols.map(([key, label]) => (
              <th
                scope="col"
                key={key}
                aria-sort={key === sortKey ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                <button className="sort-btn" onClick={() => toggle(key)}>
                  {label}
                  {key === sortKey ? (dir === 'desc' ? ' ↓' : ' ↑') : ''}
                </button>
              </th>
            ))}
            <th scope="col">{columnLabels.source}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.mission} className={kind === 'missions' && r.mission === debtMissionName ? 'debt-focus-row' : undefined}>
              <th scope="row" className="name-cell">
                {onSelect ? (
                  <button
                    id={`table-${r.mission}`}
                    className={`mission-link ${kind === 'missions' && r.mission === debtMissionName ? 'debt-focus-link' : ''}`}
                    onClick={() => onSelect(r.mission)}
                  >
                    {r.mission}
                    {kind === 'missions' && r.mission === debtMissionName && (
                      <span className="debt-cue">{debtDetailCue}</span>
                    )}
                  </button>
                ) : (
                  r.mission
                )}
              </th>
              <td className="num">{fmtEUR(r.y2026)}</td>
              <td className="num">
                <b>{fmtEUR(r.y2027)}</b>
              </td>
              <td className="num">{change(r)}</td>
              <td className="num">
                {r.share.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %
              </td>
              <td className="num">
                {r.source_pages?.split(', ').map((p, i) => (
                  <span key={p}>
                    {i > 0 ? ', ' : ''}
                    <a
                      href={plfPageUrl(p)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`PLF 2027, page ${p}, nouvel onglet`}
                    >
                      p. {p}
                    </a>
                  </span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
        {kind === 'missions' && rows.length > 0 && (
          <tfoot>
            <tr>
              <th scope="row">Total des {rows.length} domaines affichés</th>
              <td className="num">{fmtEUR(total26)}</td>
              <td className="num">
                <b>{fmtEUR(total27)}</b>
              </td>
              <td className="num">{change({ mission: '', y2026: total26, y2027: total27 })}</td>
              <td className="num">100 %</td>
              <td>p. 307–313</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
