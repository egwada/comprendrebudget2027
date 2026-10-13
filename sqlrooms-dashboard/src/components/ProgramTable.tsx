import { useState } from 'react';
import type { ProgramData } from './Dashboard';

interface Props {
  data: ProgramData[];
}

export default function ProgramTable({ data }: Props) {
  const [sortKey, setSortKey] = useState<'cp_2027' | 'cp_2026' | 'evolution'>('cp_2027');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = [...data].sort((a, b) => {
    let av: number, bv: number;
    if (sortKey === 'evolution') {
      av = a.cp_2026 ? ((a.cp_2027 - a.cp_2026) / a.cp_2026) * 100 : 0;
      bv = b.cp_2026 ? ((b.cp_2027 - b.cp_2026) / b.cp_2026) * 100 : 0;
    } else {
      av = (a as any)[sortKey] || 0;
      bv = (b as any)[sortKey] || 0;
    }
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  const handleSort = (key: 'cp_2027' | 'cp_2026' | 'evolution') => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const fmt = (n: number) =>
    n >= 1e9
      ? (n / 1e9).toFixed(2) + ' Md€'
      : n >= 1e6
      ? (n / 1e6).toFixed(1) + ' M€'
      : n.toLocaleString();

  return (
    <div style={{ background: '#fafafa', borderRadius: 8, padding: 16, border: '1px solid #e0e0e0' }}>
      <h3 style={{ marginTop: 0 }}>
        📋 Programmes {data.length > 0 ? `(${data.length})` : ''}
      </h3>
      {data.length === 0 && (
        <p style={{ color: '#666', fontStyle: 'italic' }}>
          Cliquez sur une mission dans le treemap pour voir ses programmes.
        </p>
      )}
      {data.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#e3f2fd' }}>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ccc' }}>Programme</th>
                <th
                  style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ccc', cursor: 'pointer' }}
                  onClick={() => handleSort('cp_2026')}
                >
                  CP 2026 {sortKey === 'cp_2026' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                </th>
                <th
                  style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ccc', cursor: 'pointer' }}
                  onClick={() => handleSort('cp_2027')}
                >
                  CP 2027 {sortKey === 'cp_2027' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                </th>
                <th
                  style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ccc', cursor: 'pointer' }}
                  onClick={() => handleSort('evolution')}
                >
                  Évolution {sortKey === 'evolution' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => {
                const evol = p.cp_2026 ? ((p.cp_2027 - p.cp_2026) / p.cp_2026) * 100 : 0;
                const color = evol > 0 ? '#d32f2f' : evol < 0 ? '#388e3c' : '#666';
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 8 }}>{p.programme}</td>
                    <td style={{ textAlign: 'right', padding: 8, fontFamily: 'monospace' }}>{fmt(p.cp_2026)}</td>
                    <td style={{ textAlign: 'right', padding: 8, fontFamily: 'monospace' }}>{fmt(p.cp_2027)}</td>
                    <td style={{ textAlign: 'right', padding: 8, fontFamily: 'monospace', color }}>
                      {evol.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
