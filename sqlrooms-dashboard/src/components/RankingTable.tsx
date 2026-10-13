import { useMemo, useState } from 'react';
import type { MissionRow } from './Dashboard';
import { fmtEUR, evolutionLabel, evolutionPct } from '../lib/format';

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
  const rows = useMemo(() => data.map((r) => ({ ...r, evol: evolutionPct(r.y2026, r.y2027), share: totalRef ? r.y2027 / totalRef * 100 : 0 }))
    .sort((a, b) => {
      const s = dir === 'asc' ? 1 : -1;
      if (sortKey === 'name') return a.mission.localeCompare(b.mission, 'fr') * s;
      const av = sortKey === 'evol' ? a.evol ?? -Infinity : a[sortKey];
      const bv = sortKey === 'evol' ? b.evol ?? -Infinity : b[sortKey];
      return av === bv ? 0 : (av > bv ? 1 : -1) * s;
    }), [data, totalRef, sortKey, dir]);
  const toggle = (key: SortKey) => {
    if (key === sortKey) setDir(dir === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setDir(key === 'name' ? 'asc' : 'desc'); }
  };
  const cols: [SortKey, string][] = [['name', kind === 'missions' ? 'Mission' : 'Programme'], ['y2026', 'LFI 2026'], ['y2027', 'PLF 2027'], ['evol', 'Évolution'], ['share', 'Part']];
  const total26 = data.reduce((s, r) => s + r.y2026, 0);
  const total27 = data.reduce((s, r) => s + r.y2027, 0);
  const change = (r: MissionRow) => <span className={`badge ${r.y2027 > r.y2026 ? 'up' : r.y2027 < r.y2026 ? 'down' : 'zero'}`}>{evolutionLabel(r.y2026, r.y2027)}</span>;
  return <div className="tbl-wrap" tabIndex={0} role="region" aria-label={`Tableau des ${kind}, défilement horizontal possible`}>
    <table className="tbl">
      <caption>Crédits prévus par {kind === 'missions' ? 'mission' : 'programme'} — montants en euros (Md€ : milliards ; M€ : millions). La part porte sur {kind === 'missions' ? 'le total affiché' : 'le total imprimé de la mission'}.</caption>
      <thead><tr>{cols.map(([key, label]) => <th scope="col" key={key} aria-sort={key === sortKey ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}><button className="sort-btn" onClick={() => toggle(key)}>{label}{key === sortKey ? dir === 'desc' ? ' ↓' : ' ↑' : ''}</button></th>)}<th scope="col">Source PDF</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.mission}>
        <th scope="row" className="name-cell">{onSelect ? <button id={`table-${r.mission}`} className="mission-link" onClick={() => onSelect(r.mission)}>{r.mission}</button> : r.mission}</th>
        <td className="num">{fmtEUR(r.y2026)}</td><td className="num"><b>{fmtEUR(r.y2027)}</b></td><td className="num">{change(r)}</td>
        <td className="num">{r.share.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %</td>
        <td className="num">{r.source_pages?.split(', ').map((p, i) => <span key={p}>{i > 0 ? ', ' : ''}<a href={`/sources/l17b3210_projet-loi.pdf#page=${p}`} target="_blank" rel="noreferrer" aria-label={`PLF 2027, page ${p}, nouvel onglet`}>p. {p}</a></span>)}</td>
      </tr>)}</tbody>
      {kind === 'missions' && rows.length > 0 && <tfoot><tr><th scope="row">Total ({rows.length} missions)</th><td className="num">{fmtEUR(total26)}</td><td className="num"><b>{fmtEUR(total27)}</b></td><td className="num">{change({ mission: '', y2026: total26, y2027: total27 })}</td><td className="num">100 %</td><td>p. 307–313</td></tr></tfoot>}
    </table>
  </div>;
}
