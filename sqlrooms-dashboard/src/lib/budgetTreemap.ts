export interface BudgetCreditRow {
  mission: string;
  programme: string;
  montant: number;
}

export interface BudgetTreemapNode {
  [key: string]: unknown;
  name: string;
  mission: string;
  amount: number;
  size: number;
  programme?: string;
  children?: BudgetTreemapNode[];
}

const TOTAL_ROW = '(total mission)';

/** Build a hierarchy whose mission areas preserve the printed mission totals. */
export function buildBudgetTreemap(rows: BudgetCreditRow[]): BudgetTreemapNode[] {
  const missions = new Map<
    string,
    { total?: number; programs: BudgetCreditRow[] }
  >();

  for (const row of rows) {
    const mission = missions.get(row.mission) ?? { programs: [] };
    if (row.programme === TOTAL_ROW) mission.total = row.montant;
    else mission.programs.push(row);
    missions.set(row.mission, mission);
  }

  return [...missions.entries()]
    .map(([missionName, entry]) => {
      const total = entry.total ?? entry.programs.reduce((sum, row) => sum + row.montant, 0);
      const positivePrograms = entry.programs
        .filter((row) => row.montant > 0)
        .sort((a, b) => b.montant - a.montant || a.programme.localeCompare(b.programme, 'fr'));
      const programTotal = positivePrograms.reduce((sum, row) => sum + row.montant, 0);
      const scale = total > 0 && programTotal > 0 ? total / programTotal : 1;
      const children = positivePrograms.map((row) => ({
        name: row.programme,
        programme: row.programme,
        mission: missionName,
        amount: row.montant,
        size: row.montant * scale,
      }));

      if (total > 0 && children.length === 0) {
        children.push({
          name: 'Détail non disponible',
          programme: 'Détail non disponible',
          mission: missionName,
          amount: total,
          size: total,
        });
      }

      return {
        name: missionName,
        mission: missionName,
        amount: total,
        size: total,
        children,
      };
    })
    .filter((mission) => mission.amount > 0 && mission.children?.length)
    .sort((a, b) => b.amount - a.amount);
}

function hueFor(name: string): number {
  let hash = 2166136261;
  for (let i = 0; i < name.length; i++) {
    hash = Math.imul(hash ^ name.charCodeAt(i), 16777619) >>> 0;
  }
  return hash % 360;
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = lightness - chroma / 2;
  const [r, g, b] =
    hue < 60 ? [chroma, x, 0] : hue < 120 ? [x, chroma, 0] : hue < 180 ? [0, chroma, x] :
    hue < 240 ? [0, x, chroma] : hue < 300 ? [x, 0, chroma] : [chroma, 0, x];
  return `#${[r, g, b]
    .map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

/** A stable hue groups programs under the same mission; lightness distinguishes programs. */
export function missionTreemapColor(mission: string, lightness = 0.4): string {
  return hslToHex(hueFor(mission), 0.58, lightness);
}

export function programTreemapColor(mission: string, index: number): string {
  const shades = [0.31, 0.38, 0.45, 0.52, 0.59, 0.66];
  return missionTreemapColor(mission, shades[index % shades.length]);
}
