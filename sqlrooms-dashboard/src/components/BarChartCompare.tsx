import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { CompareData } from './Dashboard';

interface Props {
  data: CompareData[];
}

export default function BarChartCompare({ data }: Props) {
  const chartData = data.map((d) => ({
    name: d.mission.length > 25 ? d.mission.slice(0, 22) + '…' : d.mission,
    'LFI 2026': (d.cp_2026 || 0) / 1e9,
    'PLF 2027': (d.cp_2027 || 0) / 1e9,
  }));

  return (
    <div style={{ background: '#fafafa', borderRadius: 8, padding: 16, border: '1px solid #e0e0e0' }}>
      <h3 style={{ marginTop: 0 }}>📊 Comparaison LFI 2026 vs PLF 2027</h3>
      <p style={{ fontSize: 12, color: '#666', marginTop: -8 }}>Top 15 missions (Md€)</p>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={80} tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} label={{ value: 'Md€', angle: -90, position: 'insideLeft', fontSize: 11 }} />
          <Tooltip
            formatter={(value: any) => [(value as number).toFixed(2) + ' Md€', '']}
          />
          <Legend />
          <Bar dataKey="LFI 2026" fill="#82ca9d" />
          <Bar dataKey="PLF 2027" fill="#1976d2" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
