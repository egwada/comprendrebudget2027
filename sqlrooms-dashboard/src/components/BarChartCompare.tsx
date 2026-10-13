import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ResponsiveContainer,
} from 'recharts';
import type { MissionRow } from './Dashboard';
import { fmtMd, truncate, fmtEUR } from '../lib/format';

interface Props {
  data: MissionRow[];
  creditType: 'CP' | 'AE';
  onSelect: (mission: string) => void;
}

interface BarItem {
  name: string;
  mission: string;
  'LFI 2026': number;
  'PLF 2027': number;
  lbl: string;
}

export default function BarChartCompare({ data, creditType, onSelect }: Props) {
  const md = (v: number) => Math.round(v / 1e8) / 10;
  const chartData: BarItem[] = data.map((d) => ({
    name: truncate(d.mission, 34),
    mission: d.mission,
    'LFI 2026': md(d.y2026),
    'PLF 2027': md(d.y2027),
    lbl: fmtMd(d.y2027) + ' Md€',
  }));

  return (
    <div className="panel">
      <h3>LFI 2026 → PLF 2027, mission par mission</h3>
      <p className="hint">
        Top {data.length} en {creditType} 2027 (Md€). Barre claire : LFI 2026 · barre foncée : PLF
        2027. Cliquez sur une mission pour la détailler.
      </p>
      {chartData.length === 0 ? (
        <div className="empty">Aucune donnée à afficher.</div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(420, data.length * 30)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 6, right: 64, left: 8, bottom: 6 }}
            onClick={(s: any) => {
              const index = s?.activeTooltipIndex == null ? -1 : Number(s.activeTooltipIndex);
              const m =
                Number.isInteger(index) && index >= 0
                  ? chartData[index]?.mission
                  : s?.activePayload?.[0]?.payload?.mission;
              if (m) onSelect(m);
            }}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#ececf2" />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: '#6b6b78' }}
              tickFormatter={(v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={215}
              tick={{ fontSize: 11, fill: '#16161f' }}
              interval={0}
            />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,145,0.04)' }}
              content={({ active, payload }: any) => {
                if (!active || !payload?.length) return null;
                const it = payload[0].payload as BarItem;
                return (
                  <div className="tt">
                    <b>{it.mission}</b>
                    <div style={{ marginTop: 4 }}>
                      LFI 2026 : <b>{fmtEUR(it['LFI 2026'] * 1e9)}</b>
                    </div>
                    <div className="tt-muted">PLF 2027 : {fmtEUR(it['PLF 2027'] * 1e9)}</div>
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="LFI 2026"
              fill="#c5c5f2"
              radius={[0, 3, 3, 0]}
              barSize={11}
              isAnimationActive={false}
            />
            <Bar
              dataKey="PLF 2027"
              fill="#000091"
              radius={[0, 3, 3, 0]}
              barSize={11}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="lbl"
                position="right"
                style={{ fill: '#000091', fontSize: 10.5, fontWeight: 700 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
