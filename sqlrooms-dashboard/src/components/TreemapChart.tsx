import { Treemap, Tooltip, ResponsiveContainer } from 'recharts';
import type { MissionData } from './Dashboard';

interface Props {
  data: MissionData[];
  onMissionClick: (mission: string) => void;
}

export default function TreemapChart({ data, onMissionClick }: Props) {
  const chartData = data.map((m) => ({
    name: m.mission,
    size: m.total || 0,
    formatted: ((m.total || 0) / 1e9).toFixed(2) + ' Md€',
  }));

  return (
    <div style={{ background: '#fafafa', borderRadius: 8, padding: 16, border: '1px solid #e0e0e0' }}>
      <h3 style={{ marginTop: 0 }}>🗺️ Répartition par mission</h3>
      <p style={{ fontSize: 12, color: '#666', marginTop: -8 }}>
        Surface = montant CP 2027. Cliquez pour explorer les programmes.
      </p>
      <ResponsiveContainer width="100%" height={350}>
        <Treemap
          data={chartData}
          dataKey="size"
          nameKey="name"
          aspectRatio={4 / 3}
          stroke="#fff"
          fill="#1976d2"
          onClick={(node: any) => {
            if (node?.name) onMissionClick(node.name);
          }}
        >
          <Tooltip
            content={({ active, payload }: any) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload;
                return (
                  <div style={{ background: '#fff', padding: 8, border: '1px solid #ccc', borderRadius: 4, fontSize: 13 }}>
                    <strong>{d.name}</strong>
                    <div>{d.formatted}</div>
                  </div>
                );
              }
              return null;
            }}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}
