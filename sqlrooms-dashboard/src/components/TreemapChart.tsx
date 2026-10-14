import { Treemap, Tooltip, ResponsiveContainer } from 'recharts';
import type { MissionRow } from './Dashboard';
import { colorFor, labelColorFor, fmtEUR, fmtPct, truncate } from '../lib/format';

interface Props {
  data: MissionRow[];
  total: number;
  onSelect: (mission: string) => void;
}

interface CellItem extends MissionRow {
  share: number;
}

const Cell = (props: any) => {
  const { x, y, width, height, name } = props;
  const amount = props.y2027 ?? props.value;
  if (width <= 0 || height <= 0 || !name) return null;
  const bg = colorFor(name);
  const fg = labelColorFor(bg);
  const showName = width > 64 && height > 30;
  const showVal = width > 110 && height > 52;
  return (
    <g
      className="tm-cell"
      role="button"
      tabIndex={0}
      aria-label={`${name} : ${fmtEUR(amount)} de crédits prévus. Voir les actions financées dans ce domaine.`}
      onClick={() => props?.onSelect?.(name)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          props?.onSelect?.(name);
        }
      }}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={5}
        fill={bg}
        stroke="#fff"
        strokeWidth={2}
      />
      {showName && (
        <text x={x + 9} y={y + 19} fill={fg} fontSize={11} fontWeight={600}>
          {truncate(name, 24)}
        </text>
      )}
      {showVal && (
        <text x={x + 9} y={y + 39} fill={fg} fontSize={14} fontWeight={800}>
          {fmtEUR(amount)}
        </text>
      )}
    </g>
  );
};

export default function TreemapChart({ data, total, onSelect }: Props) {
  const chartData: CellItem[] = data.map((m) => ({
    ...m,
    share: total ? (m.y2027 / total) * 100 : 0,
  }));
  const byName = new Map(chartData.map((c) => [c.mission, c]));

  return (
    <div className="panel">
      <h3>Quels domaines représentent la plus grande part du budget ?</h3>
      <p className="hint">
        Chaque rectangle représente un domaine : plus il est grand, plus le montant de crédits
        prévu pour 2027 est élevé. Un domaine est appelé « mission » dans le budget. Sélectionnez un
        rectangle pour découvrir les actions financées dans ce domaine.
      </p>
      {chartData.length === 0 ? (
        <div className="empty">Aucune mission ne correspond à la recherche.</div>
      ) : (
        <ResponsiveContainer width="100%" height={420}>
          <Treemap
            data={chartData as any}
            dataKey="y2027"
            nameKey="mission"
            stroke="#fff"
            content={<Cell onSelect={onSelect} />}
            isAnimationActive={false}
          >
            <Tooltip
              content={({ active, payload }: any) => {
                if (!active || !payload?.length) return null;
                const c =
                  (payload[0].payload as CellItem) ?? byName.get(payload[0].payload?.mission);
                if (!c) return null;
                return (
                  <div className="tt">
                    <b>{c.mission}</b>
                    <div style={{ marginTop: 4 }}>
                      Crédits prévus pour 2027 : <b>{fmtEUR(c.y2027)}</b>
                    </div>
                    <div className="tt-muted">
                      {fmtPct(c.share, 1)} des crédits affichés · votés en 2026 : {fmtEUR(c.y2026)}
                    </div>
                  </div>
                );
              }}
            />
          </Treemap>
        </ResponsiveContainer>
      )}
    </div>
  );
}
