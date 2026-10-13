import { useMemo, useState } from 'react';
import type { MissionRow } from './Dashboard';
import { fmtEUR, fmtPct, evolutionPct } from '../lib/format';

interface Props {
  data: MissionRow[]; // mission OR programme rows (mission = libellé)
  totalRef: number; // dénominateur pour la part (total missions ou total programmes)
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
          if (sortKey === 'evol') return ((a.evol ?? -Infinity) - (b.evol ?? -Infinity)) * s;
          return ((a as any)[sortKey] - (b as any)[sortKey]) * s;
        }),
    [data, sortKey, dir, totalRef]
  );

  const toggle = (k: SortKey) => {
    if (k === sortKey) setDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else {
      setSortKey(k);
      setDir(k === 'name' ? 'asc' : 'desc');
    }
  };

  const arrow = (k: SortKey) => (sortKey === k ? (dir === 'desc' ? ' ↓' : ' ↑') : '');

  const total26 = data.reduce((s, r) => s + r.y2026, 0);
  const total27 = data.reduce((s, r) => s + r.y2027, 0);

  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th className="sortable" onClick={() => toggle('name')}>
              {kind === 'missions' ? 'Mission' : 'Programme'}
              {arrow('name')}
            </th>
            <th className="sortable" onClick={() => toggle('y2026')}>
              LFI 2026{arrow('y2026')}
            </th>
            <th className="sortable" onClick={() => toggle('y2027')}>
              PLF 2027{arrow('y2027')}
            </th>
            <th className="sortable" onClick={() => toggle('evol')}>
              Évolution{arrow('evol')}
            </th>
            <th className="sortable" onClick={() => toggle('share')}>
              Part{arrow('share')}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const badge =
              r.evol === null ? (
                <span className="badge zero">nouveau</span>
              ) : (
                <span
                  className={`badge ${r.evol > 0 ? 'up' : r.evol < 0 ? 'down' : 'zero'}`}
                >
                  {fmtPct(r.evol)}
                </span>
              );
            return (
              <tr
                key={r.mission}
                className={kind === 'missions' && onSelect ? 'row-click' : undefined}
                onClick={
                  kind === 'missions' && onSelect ? () => onSelect(r.mission) : undefined
                }
                title={
                  kind === 'missions' && onSelect
                    ? `Voir les programmes de « ${r.mission} »`
                    : undefined
                }
              >
                <td className="name-cell">{r.mission}</td>
                <td className="num">{fmtEUR(r.y2026)}</td>
                <td className="num">
                  <b>{fmtEUR(r.y2027)}</b>
                </td>
                <td className="num">{badge}</td>
                <td className="num">
                  <span style={{ marginRight: 8 }}>{fmtPct(r.share, 1)}</span>
                  <span className="sharebar">
                    <i style={{ width: `${Math.min(100, Math.max(0, r.share))}%` }} />
                  </span>
                </td>
              </tr>
            );
          })}
          {kind === 'missions' && rows.length > 0 && (
            <tr style={{ background: '#f6f6fa', fontWeight: 700 }}>
              <td className="name-cell">Total ({rows.length} missions)</td>
              <td className="num">{fmtEUR(total26)}</td>
              <td className="num">
                <b>{fmtEUR(total27)}</b>
              </td>
              <td className="num">
                {evolutionPct(total26, total27) !== null ? (
                  <span
                    className={`badge ${total27 > total26 ? 'up' : total27 < total26 ? 'down' : 'zero'}`}
                  >
                    {fmtPct(evolutionPct(total26, total27)!)}
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td className="num">100 %</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}